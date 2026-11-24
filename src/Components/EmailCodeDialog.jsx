import { useCallback, useEffect, useRef, useState } from "react";
import "./EmailCodeDialog.css";

/*
  Asks for a 6-digit code using the send and confirm callbacks supplied by its caller.

    <EmailCodeDialog
      open={codeOpen}
      theme="light"
      title="Confirm your email"
      verifyLabel="Create my account"
      initial={{ sentTo, expiresInMinutes, resendAfterSeconds }}   // code already sent: skip the first send
      send={() => resendSignupCode(email)}                          // used for "Send a new code"
      confirm={(code) => verifySignup({ email, code })}
      onVerified={(result) => { ...whatever confirm returned... }}
      onClose={() => setCodeOpen(false)}
    />
*/

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ec-svg">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 7.5l8.5 6 8.5-6" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ec-svg">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const EmailCodeDialog = ({
  open,
  onClose,
  onVerified,
  summary,
  send,
  confirm,
  initial,
  theme = "dark",
  title = "Check your email",
  verifyLabel = "Verify code",
}) => {
  const [phase, setPhase] = useState("sending"); // sending | ready | failed
  const [sentTo, setSentTo] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [locked, setLocked] = useState(false);

  const inputRef = useRef(null);
  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const sendRef = useRef(send);
  const confirmRef = useRef(confirm);
  const initialRef = useRef(initial);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    sendRef.current = send;
    confirmRef.current = confirm;
    initialRef.current = initial;
  }, [send, confirm, initial]);

  /* ----- ask the server to email a code ----- */
  const sendCode = useCallback(async (isResend) => {
    setError("");
    setNotice("");
    setLocked(false);
    if (!isResend) setPhase("sending");
    try {
      if (typeof sendRef.current !== "function") {
        throw new Error("Email code sending is not configured.");
      }
      const res = await sendRef.current(Boolean(isResend));
      if (!aliveRef.current) return;
      setSentTo(res.sentTo);
      setMinutes(res.expiresInMinutes || 10);
      setCooldown(res.resendAfterSeconds || 45);
      setPhase("ready");
      if (isResend) {
        setCode("");
        setNotice("We sent you a new code.");
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) {
      if (!aliveRef.current) return;
      if (e.code === "wait" || e.code === "too_many") {
        // we may already have a code out there, so keep the box usable
        if (isResend || phase === "ready") setError(e.message);
        else {
          setPhase("failed");
          setError(e.message);
        }
        return;
      }
      if (isResend) setError(e.message);
      else {
        setPhase("failed");
        setError(e.message);
      }
    }
  }, [phase]);

  // send once each time the box opens (the guard stops a second send in development)
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setCode("");
    setError("");
    setNotice("");
    setChecking(false);
    setLocked(false);
    setCooldown(0);
    const first = initialRef.current;
    if (first) {
      // the code was already sent by the page, so go straight to the code box
      setSentTo(first.sentTo);
      setMinutes(first.expiresInMinutes || 10);
      setCooldown(first.resendAfterSeconds || 45);
      setPhase("ready");
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      sendCode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ----- resend countdown ----- */
  useEffect(() => {
    if (!open || cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [open, cooldown]);

  /* ----- Escape closes (not while checking) ----- */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !checking) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, checking, onClose]);

  /* ----- stop the page behind from scrolling ----- */
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* ----- check the code ----- */
  const verify = useCallback(
    async (value) => {
      if (checking || value.length !== 6) return;
      setChecking(true);
      setError("");
      setNotice("");
      try {
        if (typeof confirmRef.current !== "function") {
          throw new Error("Email code verification is not configured.");
        }
        const res = await confirmRef.current(value);
        if (!aliveRef.current) return;
        setChecking(false);
        onVerified(res);
      } catch (e) {
        if (!aliveRef.current) return;
        setChecking(false);
        setError(e.message);
        if (e.code === "locked" || e.code === "expired") setLocked(true);
        setCode("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [checking, onVerified]
  );

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (error) setError("");
    if (digits.length === 6) verify(digits);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      inputRef.current?.focus();
      return;
    }
    verify(code);
  };

  if (!open) return null;

  return (
    <div className={`ec-overlay ${theme === "light" ? "light" : ""}`} role="presentation">
      <div className="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="ec-title" aria-describedby="ec-desc">
        <button type="button" className="ec-close" aria-label="Close" onClick={onClose} disabled={checking}>
          <CloseIcon />
        </button>

        <span className="ec-badge">
          <MailIcon />
        </span>

        <h2 id="ec-title">{title}</h2>

        {phase === "sending" && (
          <div className="ec-wait" role="status" aria-live="polite">
            <span className="ec-spinner" aria-hidden="true" />
            <p id="ec-desc">Sending your code…</p>
          </div>
        )}

        {phase === "failed" && (
          <>
            <p id="ec-desc" className="ec-alert" role="alert">
              {error || "We couldn't send the code. Please try again."}
            </p>
            <div className="ec-actions">
              <button type="button" className="ec-btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="ec-btn primary" onClick={() => sendCode(false)}>
                Try again
              </button>
            </div>
          </>
        )}

        {phase === "ready" && (
          <form onSubmit={handleSubmit} noValidate>
            <p id="ec-desc" className="ec-lead">
              We sent a 6-digit code to <strong>{sentTo}</strong>. Enter it below to continue.
            </p>

            {summary && <p className="ec-summary">{summary}</p>}

            <label htmlFor="ec-code" className="ec-sr">
              6-digit verification code
            </label>
            <input
              id="ec-code"
              ref={inputRef}
              className={`ec-code ${error ? "bad" : ""}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={handleChange}
              disabled={checking || locked}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "ec-error" : undefined}
            />

            <div className="ec-msg" aria-live="polite">
              {error && (
                <p id="ec-error" className="ec-error" role="alert">
                  {error}
                </p>
              )}
              {!error && notice && <p className="ec-notice">{notice}</p>}
            </div>

            <p className="ec-hint">
              The code works for {minutes} minutes. Can&apos;t find it? Check your spam folder.
            </p>

            <div className="ec-actions">
              <button type="button" className="ec-btn ghost" onClick={onClose} disabled={checking}>
                Cancel
              </button>
              <button type="submit" className="ec-btn primary" disabled={checking || locked || code.length !== 6}>
                {checking ? (
                  <>
                    <span className="ec-spinner small" aria-hidden="true" />
                    Checking…
                  </>
                ) : (
                  verifyLabel
                )}
              </button>
            </div>

            <p className="ec-resend">
              {cooldown > 0 && !locked ? (
                <span>Send a new code in {cooldown}s</span>
              ) : (
                <>
                  Didn&apos;t get a code?{" "}
                  <button type="button" className="ec-link" onClick={() => sendCode(true)} disabled={checking}>
                    Send a new code
                  </button>
                </>
              )}
            </p>

            <p className="ec-security">
              KinvestBank will never call or message you to ask for this code.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmailCodeDialog;