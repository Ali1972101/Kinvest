import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { verifyPassword } from "../Pages/cardAccess";
import "../Pages/CardReveal.css";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60;
const LOCK_KEY = "kinvest_reveal_lock";

const emptyLock = { attempts: 0, lockedUntil: 0 };

const readLock = () => {
  try {
    return JSON.parse(sessionStorage.getItem(LOCK_KEY)) || emptyLock;
  } catch {
    return emptyLock;
  }
};

const writeLock = (value) => {
  try {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable, ignore */
  }
};

const Eye = ({ off }) => (
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

const VerifyDialog = ({
  open,
  onClose,
  onVerified,
  title = "Verify it's you",
  description = "Enter your password to view your full card details. They hide again after 30 seconds.",
}) => {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const locked = secondsLeft > 0;

  // start fresh every time the box opens
  useEffect(() => {
    if (!open) return undefined;

    setPassword("");
    setVisible(false);
    setError("");
    setBusy(false);
    setLockedUntil(readLock().lockedUntil);
    setNow(Date.now());

    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // lock countdown
  useEffect(() => {
    if (!open || !locked) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [open, locked]);

  // Esc closes, Tab stays inside the box, and the page behind stops scrolling
  useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = dialogRef.current?.querySelectorAll("button:not([disabled]), input:not([disabled])");
      if (!nodes || nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || locked) return;

    if (!password) {
      setError("Enter your password");
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");

    let ok = false;
    try {
      ok = await verifyPassword(password);
    } catch {
      setError("We couldn't verify your password. Please try again.");
      setBusy(false);
      return;
    }

    if (ok) {
      writeLock(emptyLock);
      setPassword("");
      setBusy(false);
      onVerified();
      return;
    }

    const attempts = readLock().attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_SECONDS * 1000;
      writeLock({ attempts: 0, lockedUntil: until });
      setLockedUntil(until);
      setNow(Date.now());
    } else {
      writeLock({ attempts, lockedUntil: 0 });
      const left = MAX_ATTEMPTS - attempts;
      setError(`That password isn't correct. ${left} attempt${left === 1 ? "" : "s"} left.`);
    }

    setPassword("");
    setBusy(false);
    inputRef.current?.focus();
  };

  return createPortal(
    <div className="rv-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="rv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rv-title"
        aria-describedby="rv-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rv-shield" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>

        <h2 id="rv-title">{title}</h2>
        <p id="rv-desc">{description}</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="rv-password">Password</label>

          <div className={`rv-input ${error ? "has-error" : ""}`}>
            <input
              ref={inputRef}
              id="rv-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              disabled={busy || locked}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "rv-error" : undefined}
            />
            <button
              type="button"
              className="rv-eye"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible((v) => !v)}
            >
              <Eye off={visible} />
            </button>
          </div>

          {error && (
            <p className="rv-error" id="rv-error" role="alert">
              {error}
            </p>
          )}

          {locked && (
            <p className="rv-error" role="alert">
              Too many incorrect attempts. Try again in {secondsLeft}s.
            </p>
          )}

          <div className="rv-buttons">
            <button type="button" className="rv-btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="rv-btn solid" disabled={busy || locked}>
              {busy ? (
                <>
                  <span className="rv-spinner" aria-hidden="true" />
                  Verifying…
                </>
              ) : (
                "Verify"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default VerifyDialog;