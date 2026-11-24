import { useEffect, useRef, useState } from "react";
import "./EmailCodeDialog.css";
import "./TransferCodesDialog.css";
import { verifyTransferCode } from "./authorizationApi";

/*
  Asks for the codes the admin switched on for this customer, one after the other.

    <TransferCodesDialog
      open={authOpen}
      required={["cot", "tac"]}          // from getTransferAuthorization()
      transfer={{ amount, type, recipient }}
      summary="Sending $250.00 to John Smith"
      theme="dark"
      onVerified={(proof) => { ...keep the proof, then ask for the next step... }}
      onClose={() => setAuthOpen(false)}
    />
*/

const INFO = {
  cot: {
    short: "COT code",
    title: "Cost of Transfer code",
    lead: "Enter the Cost of Transfer (COT) code for your account to continue with this transfer.",
  },
  tac: {
    short: "Transfer Access Code",
    title: "Transfer Access Code",
    lead: "Enter your Transfer Access Code (TAC) to authorise this transfer.",
  },
};

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ec-svg">
    <path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.3-7.5 9.5-4.4-1.2-7.5-5.1-7.5-9.5V6L12 3z" />
    <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ec-svg">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// "k7rm-4xq 2" -> "K7RM4XQ2", and shown as "K7RM 4XQ2"
const clean = (raw) => raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
const pretty = (value) => (value.length > 4 ? `${value.slice(0, 4)} ${value.slice(4)}` : value);

const Steps = ({ required, index }) =>
  required.length < 2 ? null : (
    <ol className="tc-steps" aria-label="Progress">
      {required.map((kind, i) => (
        <li key={kind} className={i < index ? "done" : i === index ? "now" : ""}>
          <span className="tc-dot" aria-hidden="true">
            {i < index ? "✓" : i + 1}
          </span>
          <span>{INFO[kind].short}</span>
        </li>
      ))}
    </ol>
  );

const Inner = ({ required, transfer, summary, theme, onVerified, onClose }) => {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const inputRef = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    inputRef.current?.focus();
    return () => {
      alive.current = false;
    };
  }, []);

  // Escape closes (not while checking), and the page behind stays still
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !checking) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [checking, onClose]);

  const kind = required[index];
  const info = INFO[kind];

  const submit = async (e) => {
    e.preventDefault();
    if (checking || locked) return;
    if (value.length < 6) {
      setError("Enter the full code exactly as you were given it.");
      inputRef.current?.focus();
      return;
    }

    setChecking(true);
    setError("");
    try {
      const res = await verifyTransferCode({ kind, code: value, ...transfer });
      if (!alive.current) return;
      setChecking(false);

      if (res.proof || res.remaining.length === 0) {
        onVerified(res.proof || null);
        return;
      }
      // the next code the admin switched on
      const nextKind = required.find((k) => res.remaining.includes(k));
      setIndex(Math.max(required.indexOf(nextKind), index + 1));
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 30);
    } catch (err) {
      if (!alive.current) return;
      setChecking(false);
      setError(err.message);
      if (err.code === "locked") setLocked(true);
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const last = index === required.length - 1;

  return (
    <div className={`ec-overlay ${theme === "light" ? "light" : ""}`} role="presentation">
      <div className="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="tc-title" aria-describedby="tc-desc">
        <button type="button" className="ec-close" aria-label="Close" onClick={onClose} disabled={checking}>
          <CloseIcon />
        </button>

        <span className="ec-badge">
          <ShieldIcon />
        </span>

        <h2 id="tc-title">{info.title}</h2>
        <Steps required={required} index={index} />

        <form onSubmit={submit} noValidate>
          <p id="tc-desc" className="ec-lead">
            {info.lead}
          </p>

          {summary && <p className="ec-summary">{summary}</p>}

          <label htmlFor="tc-code" className="ec-sr">
            {info.title}
          </label>
          <input
            id="tc-code"
            ref={inputRef}
            className={`ec-code tc-code ${error ? "bad" : ""}`}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={13}
            placeholder="XXXX XXXX"
            value={pretty(value)}
            onChange={(e) => {
              setValue(clean(e.target.value));
              if (error) setError("");
            }}
            disabled={checking || locked}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "tc-error" : undefined}
          />

          <div className="ec-msg" aria-live="polite">
            {error && (
              <p id="tc-error" className="ec-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <p className="ec-hint">Don&apos;t have this code? Contact KinvestBank support and we&apos;ll help you.</p>

          <div className="ec-actions">
            <button type="button" className="ec-btn ghost" onClick={onClose} disabled={checking}>
              Cancel
            </button>
            <button type="submit" className="ec-btn primary" disabled={checking || locked || value.length < 6}>
              {checking ? (
                <>
                  <span className="ec-spinner small" aria-hidden="true" />
                  Checking…
                </>
              ) : last ? (
                "Verify and continue"
              ) : (
                "Verify code"
              )}
            </button>
          </div>

          <p className="ec-security">KinvestBank will never ask you for this code by phone, text or email.</p>
        </form>
      </div>
    </div>
  );
};

// a fresh box (and fresh state) every time it opens
const TransferCodesDialog = ({ open, required, transfer, summary, theme = "dark", onVerified, onClose }) => {
  if (!open || !Array.isArray(required) || required.length === 0) return null;
  return (
    <Inner
      required={required}
      transfer={transfer}
      summary={summary}
      theme={theme}
      onVerified={onVerified}
      onClose={onClose}
    />
  );
};

export default TransferCodesDialog;
