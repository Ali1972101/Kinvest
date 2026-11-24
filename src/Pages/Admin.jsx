import { useEffect, useMemo, useRef, useState } from "react";
import "./Admin.css";
import AdminTransferCodes from "./AdminTransferCodes";
import { formatMoney } from "../Components/transferData";
import {
  adminLogin,
  adminLogout,
  fullName,
  getAdmin,
  setUserStatus,
  topUpUser,
  useAdminLog,
  useUsers,
} from "../Components/userStore";

const MAX_TOPUP = 100000000;

const REASONS = [
  "Suspected fraud",
  "Identity verification required",
  "Compliance review",
  "Customer request",
  "Other",
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

/* ---------- Helpers ---------- */
// today's date as YYYY-MM-DD in the admin's own time zone
const todayText = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// "2026-11-24" shown as "Nov 24, 2026"
const showDate = (text) =>
  new Date(`${text}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const initials = (name) =>
  name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const cleanAmount = (raw) => {
  let v = raw.replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return v.replace(/^0+(?=\d)/, "").slice(0, 9);
};

const describe = (e) => {
  if (e.type === "top_up") return `Added ${formatMoney(e.amount)}${e.note ? ` · ${e.note}` : ""}`;
  if (e.type === "suspend") return `Suspended the account · ${e.reason}`;
  if (e.type === "reactivate") return "Reactivated the account";
  if (e.type === "blocked_transfer") return "Transfer blocked: the account is suspended";
  if (e.type === "codes_view") return "Viewed the transfer codes";
  if (e.type === "codes_enable") return `Switched on the ${e.note || "transfer code"}`;
  if (e.type === "codes_disable") return `Switched off the ${e.note || "transfer code"}`;
  if (e.type === "codes_regenerate") return `Created a new ${e.note || "transfer code"}`;
  return e.type;
};

const Badge = ({ status }) => (
  <span className={`ad-badge ${status}`}>{status === "active" ? "Active" : "Suspended"}</span>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/* ---------- Sign in ---------- */
const AdminLogin = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    const ok = await adminLogin(email, password);
    setBusy(false);

    if (ok) onSuccess();
    else {
      setError("The email or password is incorrect.");
      setPassword("");
    }
  };

  return (
    <div className="ad-login-page">
      <form className="ad-login" onSubmit={submit}>
        <span className="ad-brand-mark large">K</span>
        <h1>Admin sign in</h1>
        <p className="ad-login-sub">Authorised KinvestBank staff only.</p>

        <label htmlFor="ad-email">Email</label>
        <input
          id="ad-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="ad-password">Password</label>
        <input
          id="ad-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="ad-btn primary block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="ad-login-note">All actions in this console are recorded.</p>
      </form>
    </div>
  );
};

/* ---------- Confirmation box ---------- */
const ConfirmDialog = ({ title, children, confirmLabel, danger, onConfirm, onCancel }) => {
  const cancelRef = useRef(null);
  const cancelFn = useRef(onCancel);
  cancelFn.current = onCancel;

  useEffect(() => {
    cancelRef.current?.focus(); // the safe choice is focused first
    const onKey = (e) => {
      if (e.key === "Escape") cancelFn.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ad-overlay center" onClick={onCancel}>
      <div
        className="ad-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ad-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ad-confirm-title">{title}</h2>
        <div className="ad-dialog-body">{children}</div>
        <div className="ad-dialog-actions">
          <button type="button" ref={cancelRef} className="ad-btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`ad-btn ${danger ? "danger" : "primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Customer panel ---------- */
const UserPanel = ({ user, log, locked, onClose, onAsk, onToast }) => {
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");
  const [date, setDate] = useState(todayText);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [topErr, setTopErr] = useState("");
  const [reasonErr, setReasonErr] = useState("");

  const name = fullName(user);
  const suspended = user.status === "suspended";
  const history = log.filter((e) => e.userId === user.id).slice(0, 6);

  // start with clean forms whenever a different customer is opened
  useEffect(() => {
    setAmount("");
    setSender("");
    setDate(todayText());
    setNote("");
    setReason("");
    setTopErr("");
    setReasonErr("");
  }, [user.id]);

  // Esc closes the panel (but not while a confirmation box is open)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [locked, onClose]);

  const askTopUp = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setTopErr("Enter an amount greater than zero");
    if (n > MAX_TOPUP) return setTopErr(`The maximum for one top up is ${formatMoney(MAX_TOPUP)}`);
    if (sender.trim().length < 2) return setTopErr("Enter who is sending the money");
    if (!date) return setTopErr("Choose the date of the transfer");
    if (date > todayText()) return setTopErr("The transfer date can't be in the future");
    setTopErr("");
    onAsk({ kind: "topup", user, amount: n, sender: sender.trim(), date, note: note.trim() });
    return undefined;
  };

  const askSuspend = () => {
    if (!reason) return setReasonErr("Choose a reason");
    setReasonErr("");
    onAsk({ kind: "suspend", user, reason });
    return undefined;
  };

  const details = [
    ["Email", user.email],
    ["Phone", user.phone || "Not provided"],
    ["Account type", user.accountType],
    ["User ID", user.userId],
    ["Account number", user.accountNumber],
    ["Customer since", fmtDate(user.createdAt)],
  ];

  return (
    <div className="ad-overlay" onClick={onClose}>
      <aside
        className="ad-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ad-drawer-head">
          <span className="ad-avatar large">{initials(name)}</span>
          <div>
            <h2 id="ad-drawer-title">{name}</h2>
            <Badge status={user.status} />
          </div>
          <button type="button" className="ad-icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="ad-drawer-body">
          <section className="ad-balance">
            <span>Current balance</span>
            <strong>{formatMoney(user.balance)}</strong>
          </section>

          <section>
            <h3>Customer details</h3>
            <dl className="ad-details">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3>Top up balance</h3>
            <form onSubmit={askTopUp} noValidate>
              <label htmlFor="ad-amount">Amount (USD)</label>
              <div className={`ad-field ${topErr ? "has-error" : ""}`}>
                <span aria-hidden="true">$</span>
                <input
                  id="ad-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(cleanAmount(e.target.value))}
                />
              </div>
              {topErr && (
                <p className="ad-error" role="alert">
                  {topErr}
                </p>
              )}

              <label htmlFor="ad-sender">Sent by (name of the person or company)</label>
              <input
                id="ad-sender"
                className="ad-plain"
                type="text"
                maxLength={80}
                autoComplete="off"
                placeholder="e.g. John Smith or Acme Ltd"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />

              <label htmlFor="ad-date">Date of the transfer</label>
              <input
                id="ad-date"
                className="ad-plain"
                type="date"
                max={todayText()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <label htmlFor="ad-note">Note (optional)</label>
              <input
                id="ad-note"
                className="ad-plain"
                type="text"
                maxLength={80}
                placeholder="e.g. Cash deposit at branch"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <button type="submit" className="ad-btn primary block">
                Add funds
              </button>
            </form>
          </section>

          <section>
            <h3>Account status</h3>

            {suspended ? (
              <>
                <p className="ad-status-note">
                  This account is suspended. The customer cannot send money.
                  <br />
                  <strong>Reason:</strong> {user.statusReason || "Not recorded"}
                  {user.statusChangedAt && <span> · since {fmtDate(user.statusChangedAt)}</span>}
                </p>
                <button type="button" className="ad-btn primary block" onClick={() => onAsk({ kind: "reactivate", user })}>
                  Reactivate account
                </button>
              </>
            ) : (
              <>
                <label htmlFor="ad-reason">Reason for suspending</label>
                <select
                  id="ad-reason"
                  className="ad-plain"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {reasonErr && (
                  <p className="ad-error" role="alert">
                    {reasonErr}
                  </p>
                )}
                <button type="button" className="ad-btn danger block" onClick={askSuspend}>
                  Suspend account
                </button>
              </>
            )}
          </section>

          <section>
            <h3>Transfer authorization</h3>
            <AdminTransferCodes key={user.id} user={user} onToast={onToast} />
          </section>

          <section>
            <h3>Recent activity</h3>
            {history.length === 0 ? (
              <p className="ad-muted">No admin activity for this customer yet.</p>
            ) : (
              <ul className="ad-history">
                {history.map((e) => (
                  <li key={e.id}>
                    <strong>{describe(e)}</strong>
                    <small>
                      {fmtDateTime(e.at)} · {e.admin}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};

/* ---------- Console ---------- */
const Console = ({ admin, onLogout }) => {
  const users = useUsers();
  const log = useAdminLog();

  const [tab, setTab] = useState("customers");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      balance: users.reduce((sum, u) => sum + u.balance, 0),
    }),
    [users]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...users]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((u) => filter === "all" || u.status === filter)
      .filter(
        (u) =>
          !q ||
          [fullName(u), u.email, u.phone, u.accountNumber, u.userId].join(" ").toLowerCase().includes(q)
      );
  }, [users, query, filter]);

  const selected = users.find((u) => u.id === selectedId) || null;

  const flash = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };

  const closePanel = () => setSelectedId(null);
  const closeConfirm = () => setPending(null);

  const confirmAction = async () => {
    if (!pending) return;
    const name = fullName(pending.user);
    let result = { ok: false, error: "Something went wrong." };
    let message = "";

    if (pending.kind === "topup") {
      result = await topUpUser(pending.user.id, pending.amount, pending.sender, pending.note, pending.date);
      message = `Added ${formatMoney(pending.amount)} to ${name}'s balance`;
    } else if (pending.kind === "suspend") {
      result = await setUserStatus(pending.user.id, "suspended", pending.reason);
      message = `${name}'s account has been suspended`;
    } else if (pending.kind === "reactivate") {
      result = await setUserStatus(pending.user.id, "active", "");
      message = `${name}'s account has been reactivated`;
    }

    setPending(null);
    flash(result.ok ? message : result.error);
  };

  const pendingName = pending ? fullName(pending.user) : "";

  return (
    <div className="ad-page">
      <header className="ad-header">
        <div className="ad-brand">
          <span className="ad-brand-mark">K</span>
          <div>
            <strong>KinvestBank</strong>
            <small>Admin console</small>
          </div>
        </div>

        <div className="ad-header-right">
          <span className="ad-admin">{admin}</span>
          <button type="button" className="ad-btn ghost light" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="ad-main">
        <section className="ad-stats" aria-label="Summary">
          <div className="ad-stat">
            <span>Total customers</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="ad-stat">
            <span>Active</span>
            <strong className="good">{stats.active}</strong>
          </div>
          <div className="ad-stat">
            <span>Suspended</span>
            <strong className="bad">{stats.suspended}</strong>
          </div>
          <div className="ad-stat">
            <span>Total balances</span>
            <strong>{formatMoney(stats.balance)}</strong>
          </div>
        </section>

        <div className="ad-tabs" role="tablist" aria-label="Sections">
          <button type="button" role="tab" aria-selected={tab === "customers"} className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>
            Customers
          </button>
          <button type="button" role="tab" aria-selected={tab === "activity"} className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
            Activity log
          </button>
        </div>

        {tab === "customers" ? (
          <section className="ad-card" aria-label="Customers">
            <div className="ad-toolbar">
              <div className="ad-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16.5 16.5L21 21" />
                </svg>
                <input
                  type="search"
                  placeholder="Search by name, email, phone or account number"
                  aria-label="Search customers"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="ad-chips" role="group" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    className={filter === f.id ? "active" : ""}
                    aria-pressed={filter === f.id}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="ad-empty">No customers match your search.</p>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Joined</th>
                      <th className="num">Balance</th>
                      <th>Status</th>
                      <th>
                        <span className="ad-sr">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id}>
                        <td data-label="Customer">
                          <div className="ad-person">
                            <span className="ad-avatar">{initials(fullName(u))}</span>
                            <div>
                              <strong>{fullName(u)}</strong>
                              <small>{u.email}</small>
                            </div>
                          </div>
                        </td>
                        <td data-label="Account" className="mono">{u.accountNumber}</td>
                        <td data-label="Type">{u.accountType}</td>
                        <td data-label="Joined">{fmtDate(u.createdAt)}</td>
                        <td data-label="Balance" className="num">{formatMoney(u.balance)}</td>
                        <td data-label="Status">
                          <Badge status={u.status} />
                        </td>
                        <td className="actions">
                          <button type="button" className="ad-btn small" onClick={() => setSelectedId(u.id)}>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="ad-card" aria-label="Activity log">
            {log.length === 0 ? (
              <p className="ad-empty">No activity recorded yet.</p>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>By</th>
                      <th>Customer</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((e) => (
                      <tr key={e.id}>
                        <td data-label="When">{fmtDateTime(e.at)}</td>
                        <td data-label="By">{e.admin}</td>
                        <td data-label="Customer">{e.userName}</td>
                        <td data-label="Action">{describe(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {selected && (
        <UserPanel
          user={selected}
          log={log}
          locked={Boolean(pending)}
          onClose={closePanel}
          onAsk={setPending}
          onToast={flash}
        />
      )}

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === "topup"
              ? "Add funds?"
              : pending.kind === "suspend"
              ? "Suspend this account?"
              : "Reactivate this account?"
          }
          confirmLabel={
            pending.kind === "topup" ? "Add funds" : pending.kind === "suspend" ? "Suspend" : "Reactivate"
          }
          danger={pending.kind === "suspend"}
          onConfirm={confirmAction}
          onCancel={closeConfirm}
        >
          {pending.kind === "topup" && (
            <p>
              You are about to add <strong>{formatMoney(pending.amount)}</strong> to {pendingName}'s
              account, sent by <strong>{pending.sender}</strong> on <strong>{showDate(pending.date)}</strong>. Their new balance will be{" "}
              <strong>{formatMoney(pending.user.balance + pending.amount)}</strong>.
            </p>
          )}
          {pending.kind === "suspend" && (
            <p>
              {pendingName} will not be able to send money. Reason: <strong>{pending.reason}</strong>.
              You can reactivate the account at any time.
            </p>
          )}
          {pending.kind === "reactivate" && (
            <p>{pendingName} will be able to send money again.</p>
          )}
        </ConfirmDialog>
      )}

      {toast && (
        <div className="ad-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
};

/* ---------- Page ---------- */
const Admin = () => {
  const [admin, setAdmin] = useState(getAdmin);

  if (!admin) return <AdminLogin onSuccess={() => setAdmin(getAdmin())} />;

  return (
    <Console
      admin={admin}
      onLogout={() => {
        adminLogout();
        setAdmin(null);
      }}
    />
  );
};

export default Admin;