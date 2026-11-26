import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import "./Recover.css";
import Navbar from "../Components/Navbar";

/* ---------- Helpers ---------- */
const onlyDigits = (value, max) => value.replace(/\D/g, "").slice(0, max);

const formatTaxId = (d) => {
  if (d.length > 5) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
};

// Basic shape check only. The server must do the real verification.
const looksLikeTaxId = (d) =>
  d.length === 9 && d.slice(0, 3) !== "000" && d.slice(3, 5) !== "00" && d.slice(5) !== "0000";

const validate = ({ account, taxId }) => {
  const e = {};
  if (account.length !== 6) e.account = "Enter the last 6 digits of your card or account number.";
  if (taxId.length !== 9) e.taxId = "Enter your 9-digit SSN or ITIN.";
  else if (!looksLikeTaxId(taxId)) e.taxId = "That number is not valid. Check it and try again.";
  return e;
};

/* ---------- Icons ---------- */
const HelpIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="rc-svg">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9" />
    <path d="M12 16.9h.01" />
  </svg>
);

const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="rc-svg">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="rc-svg">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="rc-svg">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/* ---------- Help pop-over ---------- */
const HelpTip = ({ id, label, children }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="rc-tip" ref={wrapRef}>
      <button
        type="button"
        className="rc-icon-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <HelpIcon />
      </button>
      {open && (
        <span id={id} role="note" className="rc-tip-box">
          {children}
        </span>
      )}
    </span>
  );
};

/* ---------- Page ---------- */
const Recover = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState("");
  const [taxId, setTaxId] = useState("");
  const [showTaxId, setShowTaxId] = useState(false);
  const [touched, setTouched] = useState({});
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState("form"); // form | sending | done
  const timerRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    accountRef.current?.focus();
    return () => clearTimeout(timerRef.current);
  }, []);

  const errors = validate({ account, taxId });
  const err = (field) => ((touched[field] || tried) && errors[field]) || "";
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));
  const sending = status === "sending";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const bad = Object.keys(errors);
    if (bad.length > 0) {
      setTried(true);
      document.getElementById(`rc-${bad[0]}`)?.focus();
      return;
    }

    setStatus("sending");

    // Send the details to your server here, over HTTPS, in the request body (never in the URL).
    // The SERVER must: verify them against the customer record, rate-limit attempts, never say
    // whether they matched, and send recovery instructions only to the contact details on file.
    await new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 1200);
    });

    // Do not keep the sensitive values in memory once they have been sent.
    setAccount("");
    setTaxId("");
    setShowTaxId(false);
    setStatus("done");
  };

  return (
    <div className="rc">
      <Navbar />

      <main className="rc-main">
        {status === "done" ? (
          <section className="rc-wrap" role="status" aria-live="polite">
            <div className="rc-card rc-done">
              <span className="rc-done-icon">
                <CheckIcon />
              </span>
              <h1>Check your phone and email</h1>
              <p>
                If the information you entered matches our records, we have sent instructions to
                the contact details we have on file for you. They can take a few minutes to arrive.
              </p>
              <p className="rc-muted">
                Nothing arrived? Check your spam folder, or contact us so we can help you securely.
              </p>
            </div>

            <div className="rc-actions">
              <Link to="/" className="rc-btn primary">
                Back to log in
              </Link>
            </div>
          </section>
        ) : (
          <form className="rc-wrap" onSubmit={handleSubmit} noValidate>
            <h1 className="rc-title">Recover your user ID and password</h1>

            <div className="rc-card">
              <p className="rc-lead">
                Enter the last 6 digits of your card or account number as well as your Social
                Security number (SSN) or Individual Taxpayer Identification Number (ITIN).
              </p>

              <p className="rc-required">* Response required</p>

              {/* Card or account number */}
              <div className={`rc-field ${err("account") ? "has-error" : ""}`}>
                <label htmlFor="rc-account">Card or account number (last 6 digits) *</label>
                <div className="rc-input">
                  <input
                    id="rc-account"
                    ref={accountRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={account}
                    onChange={(e) => setAccount(onlyDigits(e.target.value, 6))}
                    onBlur={blur("account")}
                    aria-required="true"
                    aria-invalid={Boolean(err("account"))}
                    aria-describedby={err("account") ? "rc-account-err" : undefined}
                    disabled={sending}
                  />
                  <HelpTip id="rc-account-help" label="Where to find your card or account number">
                    Your card number is on the front of your card. Your account number is on your
                    statements. Enter only the last 6 digits.
                  </HelpTip>
                </div>
                {err("account") && (
                  <p id="rc-account-err" className="rc-error" role="alert">
                    {err("account")}
                  </p>
                )}
              </div>

              {/* SSN or ITIN */}
              <div className={`rc-field ${err("taxId") ? "has-error" : ""}`}>
                <label htmlFor="rc-taxId">SSN or ITIN *</label>
                <div className="rc-input">
                  <input
                    id="rc-taxId"
                    type={showTaxId ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={11}
                    value={formatTaxId(taxId)}
                    onChange={(e) => setTaxId(onlyDigits(e.target.value, 9))}
                    onBlur={blur("taxId")}
                    aria-required="true"
                    aria-invalid={Boolean(err("taxId"))}
                    aria-describedby={err("taxId") ? "rc-taxId-err" : undefined}
                    disabled={sending}
                  />
                  <button
                    type="button"
                    className="rc-icon-btn"
                    aria-label={showTaxId ? "Hide SSN or ITIN" : "Show SSN or ITIN"}
                    aria-pressed={showTaxId}
                    onClick={() => setShowTaxId((s) => !s)}
                  >
                    <EyeIcon off={showTaxId} />
                  </button>
                  <HelpTip id="rc-taxId-help" label="Why we ask for your SSN or ITIN">
                    Your 9-digit Social Security number or Individual Taxpayer Identification
                    Number. We use it only to confirm it is you, and we never show it back.
                  </HelpTip>
                </div>
                {err("taxId") && (
                  <p id="rc-taxId-err" className="rc-error" role="alert">
                    {err("taxId")}
                  </p>
                )}
              </div>

              <p className="rc-secure">
                <LockIcon />
                <span>Kinqora will never ask for your password by phone, text or email.</span>
              </p>
            </div>

            <div className="rc-actions rc-recovery-actions">
              <button type="button" className="rc-btn outline" onClick={() => navigate("/")} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="rc-btn primary" disabled={sending}>
                {sending ? (
                  <>
                    <span className="rc-spinner" aria-hidden="true" />
                    Checking…
                  </>
                ) : (
                  "Next"
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      <footer className="rc-foot">
        <p>&copy; {new Date().getFullYear()} Kinqora. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Recover;