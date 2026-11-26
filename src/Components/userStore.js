/* ---------------------------------------------------------------------------
   The website's data layer. It talks to the Kinqora backend (see api.js).
   Pages keep using the same hooks as before (useCurrentUser, useMyTransactions ...).
   The latest copy of the customer's data is kept here so pages show instantly, and it
   is refreshed from the server in the background. The server is the source of truth:
   balances, fees and limits are always decided there.
--------------------------------------------------------------------------- */
import { useEffect, useSyncExternalStore } from "react";
import {
  ApiError,
  CACHE_KEY,
  clearAdminSession,
  clearSession,
  getAdminToken,
  getToken,
  request,
  requestBlob,
  setAdminToken,
  setToken,
} from "./api";

export const SUPPORT_EMAIL = "support@kinqora.com";
export const SUSPENDED_MESSAGE = `Your account has been suspended. Please contact us at ${SUPPORT_EMAIL}.`;

export const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

/* ---------- Shared state ---------- */
const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// so a page reload shows the account straight away while the fresh copy loads
const cached = getToken() ? readCache() : null;

let store = {
  user: cached?.user ?? null,
  transactions: cached?.transactions ?? [],
  users: [], // admin only
  log: [], // admin only
  avatarUrl: "",
};

const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setStore = (patch) => {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
};

const persist = () => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user: store.user, transactions: store.transactions }));
  } catch {
    /* storage unavailable, ignore */
  }
};

const setUser = (user) => {
  setStore({ user });
  persist();
};

/* ---------- Refreshing from the server ---------- */
let lastRefresh = 0;

export const refreshAccount = async (force = false) => {
  if (!getToken()) return;
  if (!force && Date.now() - lastRefresh < 4000) return;
  lastRefresh = Date.now();

  try {
    const [me, tx] = await Promise.all([request("/api/me"), request("/api/me/transactions")]);
    setStore({ user: me.user, transactions: tx.transactions });
    persist();
  } catch {
    /* offline or a short outage: keep showing the last copy */
  }
};

// pick up changes (for example money added by an admin) when the person comes back to the tab
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshAccount();
  });
}

const useAutoRefresh = () => {
  useEffect(() => {
    refreshAccount();
  }, []);
};

/* ---------- Customers: sign up, log in, log out ---------- */
export const registerUser = async (data) => {
  try {
    // no token is kept here: after signing up the customer logs in
    const res = await request("/api/auth/register", { method: "POST", body: data, quiet401: true });
    return { ok: true, user: res.user };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// returns the customer, or null when the details are wrong. Other problems (no connection,
// too many attempts) throw an Error whose message can be shown to the person.
export const loginUser = async (identifier, password) => {
  try {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: { identifier, password },
      quiet401: true,
    });
    setToken(res.token);
    setStore({ transactions: [] });
    setUser(res.user);
    lastRefresh = 0;
    refreshAccount(true);
    return res.user;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 400)) return null;
    throw err;
  }
};

export const logoutUser = () => {
  if (store.avatarUrl) URL.revokeObjectURL(store.avatarUrl);
  clearSession();
  lastRefresh = 0;
  avatarKey = null;
  setStore({ user: null, transactions: [], users: [], log: [], avatarUrl: "" });
};

// used by the "confirm with your password" box
export const verifyCurrentPassword = async (password) => {
  try {
    await request("/api/me/verify-password", { method: "POST", body: { password }, quiet401: true });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) throw err;
    return false;
  }
};

/* ---------- Reading the current customer ---------- */
export const getCurrentUser = () => store.user;
export const getTransactions = () => store.transactions;
export const getUsers = () => store.users;
export const getLog = () => store.log;

export const useCurrentUser = () => {
  useAutoRefresh();
  return useSyncExternalStore(subscribe, () => store.user);
};

export const useMyTransactions = () => {
  useAutoRefresh();
  return useSyncExternalStore(subscribe, () => store.transactions);
};

/* ---------- Money ---------- */
// Sends money. The server checks the account, works out the fee and takes the money.
export const sendTransfer = async ({ amount, type, recipient, recipientDetails, emailProof, authProof }) => {
  try {
    const res = await request("/api/transfers", {
      method: "POST",
      body: { amount, type, recipient, recipientDetails, emailProof, authProof },
    });
    setUser(res.user);
    setStore({ transactions: [res.transaction, ...store.transactions] });
    persist();
    return { ok: true, reference: res.reference, fee: res.fee, total: res.total };
  } catch (err) {
    if (err.code === "suspended") refreshAccount(true); // so the page shows the suspended notice
    return { ok: false, reason: err.code || "error", error: err.message };
  }
};

// the server already records blocked transfers, so there is nothing to do here
export const recordBlockedTransfer = () => {};

// adds money to the customer's own account after a card top up
export const creditUser = async (id, amount) => {
  try {
    const res = await request("/api/topups/card", { method: "POST", body: { amount } });
    setUser(res.user);
    setStore({ transactions: [res.transaction, ...store.transactions] });
    persist();
    return { ok: true, reference: res.reference };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/* ---------- Profile ---------- */
export const updateProfile = async (id, { firstName, lastName, phone }) => {
  try {
    const res = await request("/api/me", { method: "PATCH", body: { firstName, lastName, phone } });
    setUser(res.user);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// date of birth (the photo has its own functions below)
export const getProfileExtras = () => store.user?.profileExtras || {};

export const saveProfileExtras = async (id, { day, month, year }) => {
  try {
    const res = await request("/api/me/extras", { method: "PUT", body: { day, month, year } });
    if (store.user) setUser({ ...store.user, profileExtras: res.extras });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/* ---------- Address ---------- */
export const emptyAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

// turns a saved address into display lines
export const addressLines = (a) => {
  if (!a || !a.line1) return [];
  return [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", "), a.postalCode, a.country].filter(Boolean);
};

export const updateAddress = async (id, address) => {
  try {
    const res = await request("/api/me/address", { method: "PUT", body: address });
    setUser(res.user);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/* ---------- Profile picture ---------- */
let avatarKey = null; // which picture is currently loaded
let avatarLoading = null;

// downloads the picture (it needs the login token, so an <img> tag can't fetch it directly)
const syncAvatar = async () => {
  const u = store.user;

  if (!u || !u.hasAvatar) {
    if (store.avatarUrl) URL.revokeObjectURL(store.avatarUrl);
    avatarKey = null;
    if (store.avatarUrl) setStore({ avatarUrl: "" });
    return;
  }

  const key = String(u.avatarUpdatedAt);
  if (key === avatarKey || key === avatarLoading) return;
  avatarLoading = key;

  try {
    const blob = await requestBlob("/api/me/avatar");
    const url = URL.createObjectURL(blob);
    if (store.avatarUrl) URL.revokeObjectURL(store.avatarUrl);
    avatarKey = key;
    setStore({ avatarUrl: url });
  } catch {
    /* keep whatever is showing */
  } finally {
    avatarLoading = null;
  }
};

// the picture's address for an <img>, or "" when there isn't one (show the initials then)
export const useAvatar = () => {
  const user = useSyncExternalStore(subscribe, () => store.user);
  const url = useSyncExternalStore(subscribe, () => store.avatarUrl);

  useEffect(() => {
    syncAvatar();
  }, [user?.hasAvatar, user?.avatarUpdatedAt]);

  return user?.hasAvatar ? url : "";
};

export const uploadAvatar = async (file) => {
  try {
    const form = new FormData();
    form.append("avatar", file);
    const res = await request("/api/me/avatar", { method: "PUT", form });
    setUser(res.user);
    await syncAvatar();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const removeAvatar = async () => {
  try {
    const res = await request("/api/me/avatar", { method: "DELETE" });
    setUser(res.user);
    await syncAvatar();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/* ---------- Admin ---------- */
export const adminLogin = async (email, password) => {
  try {
    const res = await request("/api/admin/login", {
      method: "POST",
      body: { email, password },
      quiet401: true,
    });
    setAdminToken(res.token);
    try {
      sessionStorage.setItem("kinvest_admin", res.admin);
    } catch {
      /* storage unavailable, ignore */
    }
    return true;
  } catch {
    return false;
  }
};

export const getAdmin = () => {
  try {
    return getAdminToken() ? sessionStorage.getItem("kinvest_admin") : null;
  } catch {
    return null;
  }
};

export const adminLogout = () => {
  clearAdminSession();
  setStore({ users: [], log: [] });
};

const refreshUsers = async () => {
  if (!getAdminToken()) return;
  try {
    const res = await request("/api/admin/users", { admin: true });
    setStore({ users: res.users });
  } catch {
    /* keep the last list */
  }
};

const refreshLog = async () => {
  if (!getAdminToken()) return;
  try {
    const res = await request("/api/admin/log", { admin: true });
    setStore({ log: res.log });
  } catch {
    /* keep the last list */
  }
};

export const useUsers = () => {
  useEffect(() => {
    refreshUsers();
  }, []);
  return useSyncExternalStore(subscribe, () => store.users);
};

export const useAdminLog = () => {
  useEffect(() => {
    refreshLog();
  }, []);
  return useSyncExternalStore(subscribe, () => store.log);
};

export const topUpUser = async (id, amount, sender, note, date) => {
  try {
    await request(`/api/admin/users/${id}/top-up`, {
      method: "POST",
      admin: true,
      body: { amount: Number(amount), sender, note, date },
    });
    await Promise.all([refreshUsers(), refreshLog()]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
export const setUserStatus = async (id, status, reason) => {
  try {
    await request(`/api/admin/users/${id}/status`, {
      method: "POST",
      admin: true,
      body: { status, reason },
    });
    await Promise.all([refreshUsers(), refreshLog()]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};