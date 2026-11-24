import { useEffect, useState } from "react";
import { request } from "../Components/api";
import "./AdminTransferCodes.css";

/*
  Admin only. Shows a customer's Cost of Transfer (COT) code and Transfer Access Code (TAC),
  and lets the admin switch each one on or off. While a code is ON, the customer must enter it
  before any transfer is sent. Open it with:  <AdminTransferCodes key={user.id} user={user} onToast={...} />
*/

const KINDS = [
  {
    id: "cot",
    name: "Cost of Transfer code",
    short: "COT",
    about: "The customer enters this code before a transfer is sent.",
  },
  {
    id: "tac",
    name: "Transfer Access Code",
    short: "TAC",
    about: "A second code the customer must enter to authorise the transfer.",
  },
];

// "48291736" -> "4829 1736"
const spaced = (code) => (code ? `${code.slice(0, 4)} ${code.slice(4)}` : "");

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "";

const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {off ? (
      <>
        <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
      </>
    ) : (
      <>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
  </svg>
);

const AdminTransferCodes = ({ user, onToast }) => {
  const [codes, setCodes] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [shown, setShown] = useState({});
  const [confirming, setConfirming] = useState("");
  const [error, setError] = useState("");

  const tell = (message) => {
    if (typeof onToast === "function") onToast(message);
  };

  useEffect(() => {
    let alive = true;
    request(`/api/admin/users/${user.id}/transfer-codes`, { admin: true })
      .then((res) => {
        if (alive) setCodes(res.codes);
      })
      .catch((err) => {
        if (alive) setLoadError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [user.id]);

  const toggle = async (kind, enabled) => {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      const res = await request(`/api/admin/users/${user.id}/transfer-codes`, {
        method: "PUT",
        admin: true,
        body: { [kind]: enabled },
      });
      setCodes(res.codes);
      const name = KINDS.find((k) => k.id === kind).name;
      tell(`${name} switched ${enabled ? "on" : "off"} for ${user.firstName}.`);
    } catch (err) {
      setError(err.message);
    }
    setBusy("");
  };

  const regenerate = async (kind) => {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      const res = await request(`/api/admin/users/${user.id}/transfer-codes/regenerate`, {
        method: "POST",
        admin: true,
        body: { kind },
      });
      setCodes(res.codes);
      setShown((s) => ({ ...s, [kind]: true }));
      tell(`New ${KINDS.find((k) => k.id === kind).name} created.`);
    } catch (err) {
      setError(err.message);
    }
    setConfirming("");
    setBusy("");
  };

  const copy = async (kind) => {
    const code = codes && codes[kind].code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      tell("Code copied.");
    } catch {
      setError("Your browser blocked copying. Select the code and copy it by hand.");
    }
  };

  return (
    <div className="atc">
      <p className="atc-intro">
        Created automatically when the customer signed up. Only admins can see these codes. While a code is on, this
        customer must enter it before a transfer is sent.
      </p>

      {!codes && !loadError && (
        <p className="ad-muted" role="status">
          Loading codes…
        </p>
      )}
      {loadError && (
        <p className="ad-error" role="alert">
          {loadError}
        </p>
      )}

      {codes &&
        KINDS.map((k) => {
          const slot = codes[k.id];
          const on = slot.enabled;
          const code = slot.code;
          const visible = Boolean(shown[k.id]);
          const working = busy === k.id;

          return (
            <article key={k.id} className={`atc-card ${on ? "on" : ""}`}>
              <header className="atc-head">
                <div>
                  <h4>
                    {k.name} <span className="atc-tag">{k.short}</span>
                  </h4>
                  <p>{k.about}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${k.name}: ${on ? "on" : "off"}`}
                  className={`atc-switch ${on ? "on" : ""}`}
                  disabled={Boolean(busy)}
                  onClick={() => toggle(k.id, !on)}
                >
                  <span />
                </button>
              </header>

              <p className={`atc-state ${on ? "on" : ""}`}>
                {on ? "ON · the customer must enter this code to send money" : "OFF · the customer is not asked for it"}
              </p>

              <div className="atc-code-row">
                {code ? (
                  <output className={`atc-code ${visible ? "" : "hidden"}`} aria-label={`${k.name} value`}>
                    {visible ? spaced(code) : "•••• ••••"}
                  </output>
                ) : (
                  <span className="atc-code missing">Can&apos;t be read. Generate a new one.</span>
                )}

                {code && (
                  <>
                    <button
                      type="button"
                      className="atc-icon"
                      aria-label={visible ? "Hide code" : "Show code"}
                      title={visible ? "Hide" : "Show"}
                      onClick={() => setShown((s) => ({ ...s, [k.id]: !s[k.id] }))}
                    >
                      <EyeIcon off={visible} />
                    </button>
                    <button type="button" className="atc-icon" aria-label="Copy code" title="Copy" onClick={() => copy(k.id)}>
                      <CopyIcon />
                    </button>
                  </>
                )}
              </div>

              <footer className="atc-foot">
                <small>{slot.updatedAt ? `Updated ${fmt(slot.updatedAt)}` : ""}</small>

                {confirming === k.id ? (
                  <span className="atc-confirm" role="group" aria-label="Confirm new code">
                    <span>The old code stops working.</span>
                    <button type="button" className="atc-link" disabled={working} onClick={() => setConfirming("")}>
                      Cancel
                    </button>
                    <button type="button" className="atc-link danger" disabled={working} onClick={() => regenerate(k.id)}>
                      {working ? "Creating…" : "Create new code"}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="atc-link"
                    disabled={Boolean(busy)}
                    onClick={() => setConfirming(k.id)}
                  >
                    <RefreshIcon />
                    New code
                  </button>
                )}
              </footer>
            </article>
          );
        })}

      {error && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default AdminTransferCodes;
