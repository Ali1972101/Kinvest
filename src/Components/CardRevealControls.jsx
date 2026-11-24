import React, { useCallback, useEffect, useRef, useState } from "react";
import VerifyDialog from "../Pages/VerifyDialog";
import { REVEAL_SECONDS } from "./useCardreveals";
import "../Pages/CardReveal.css";

const CardRevealControls = ({ revealed, remaining, onReveal, onHide, number }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const close = useCallback(() => setOpen(false), []);

  const handleVerified = () => {
    setOpen(false);
    onReveal();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ""));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked by the browser, ignore */
    }
  };

  return (
    <>
      {revealed ? (
        <div className="rv-bar">
          <span className="rv-sr" role="status">
            Card details are visible for {REVEAL_SECONDS} seconds.
          </span>

          <div className="rv-bar-row">
            <span className="rv-timer">
              Hides in <strong>{remaining}s</strong>
            </span>

            <div className="rv-actions">
              <button type="button" className="rv-link" onClick={copy}>
                {copied ? "Copied" : "Copy number"}
              </button>
              <button type="button" className="rv-link strong" onClick={onHide}>
                Hide
              </button>
            </div>
          </div>

          <span className="rv-progress" aria-hidden="true">
            <i style={{ width: `${(remaining / REVEAL_SECONDS) * 100}%` }} />
          </span>
        </div>
      ) : (
        <button type="button" className="rv-show" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Show card details
        </button>
      )}

      <VerifyDialog open={open} onClose={close} onVerified={handleVerified} />
    </>
  );
};

export default CardRevealControls;