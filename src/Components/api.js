/* ---------------------------------------------------------------------------
   Talks to the Kinqora backend.
   Set VITE_API_URL in your website's .env file (local) and in Vercel (live):
     VITE_API_URL=http://localhost:5000
     VITE_API_URL=https://your-backend.onrender.com
--------------------------------------------------------------------------- */
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const TOKEN_KEY = "kinvest_token";
const ADMIN_TOKEN_KEY = "kinvest_admin_token";
const CACHE_KEY = "kinvest_cache";

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ---------- Tokens (kept for this browser tab only) ---------- */
const getItem = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const setItem = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable, ignore */
  }
};
const removeItem = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token) => setItem(TOKEN_KEY, token);
export const getAdminToken = () => getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token) => setItem(ADMIN_TOKEN_KEY, token);

export const clearSession = () => {
  [TOKEN_KEY, CACHE_KEY, "kinvest_auth", "kinvest_user"].forEach(removeItem);
};
export const clearAdminSession = () => {
  [ADMIN_TOKEN_KEY, "kinvest_admin"].forEach(removeItem);
};

export { CACHE_KEY };

/* ---------- Requests ---------- */
const send = async (path, { method = "GET", body, form, admin = false, quiet401 = false } = {}) => {
  const token = admin ? getAdminToken() : getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // the browser sets the multipart headers itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "We can't reach the server. Check your connection and try again.", "network");
  }

  if (res.status === 401 && token && !quiet401) {
    // the session ended: send the person back to log in
    if (admin) {
      clearAdminSession();
      window.location.reload();
    } else {
      clearSession();
      window.location.assign("/");
    }
  }

  return res;
};

const errorFrom = async (res) => {
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* not JSON */
  }
  return new ApiError(res.status, data.message || "Something went wrong. Please try again.", data.code);
};

export const request = async (path, options) => {
  const res = await send(path, options);
  if (!res.ok) throw await errorFrom(res);
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export const requestBlob = async (path, options) => {
  const res = await send(path, options);
  if (!res.ok) throw await errorFrom(res);
  return res.blob();
};