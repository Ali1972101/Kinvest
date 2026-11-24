import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import "./BalanceCard.css";
import { formatMoney } from "./transferData";
import { SUPPORT_EMAIL, useCurrentUser } from "./userStore";

const HIDE_KEY = "kinvest_hide_balance";

const readHidden = () => {
  try {
    return localStorage.getItem(HIDE_KEY) === "true";
  } catch {
    return false;
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

const BalanceCard = () => {
  const account = useCurrentUser();
  const [hidden, setHidden] = useState(readHidden);
  const [flash, setFlash] = useState(false);
  const previous = useRef(null);
  const timer = useRef(null);

  const balance = account?.balance;

  // a short highlight whenever the balance changes (for example after an admin top up)
  useEffect(() => {
    if (balance === undefined) return;
    if (previous.current !== null && previous.current !== balance) {
      setFlash(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(false), 1400);
    }
    previous.current = balance;
  }, [balance]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, String(next));
    } catch {
      /* storage unavailable, ignore */
    }
  };

  if (!account) return null;

  const suspended = account.status === "suspended";
  const [whole, cents] = formatMoney(account.balance).split(".");
  const last4 = String(account.accountNumber).slice(-4);

  return (
    <section className="bal" aria-label="Account balance">
      <div className="bal-top">
        <span className="bal-label">Available balance</span>
        <span className={`bal-pill ${suspended ? "suspended" : "active"}`}>
          {suspended ? "Suspended" : "Active"}
        </span>
      </div>

      <div className="bal-row">
        <p className={`bal-amount ${flash ? "flash" : ""}`} aria-live="polite">
          {hidden ? (
            <span className="bal-hidden" role="img" aria-label="Balance hidden">
              ••••••
            </span>
          ) : (
            <>
              <span className="bal-whole">{whole}</span>
              <span className="bal-cents">.{cents}</span>
            </>
          )}
        </p>

        <button
          type="button"
          className="bal-eye"
          aria-pressed={hidden}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          onClick={toggle}
        >
          <Eye off={hidden} />
        </button>
      </div>

      <div className="bal-bottom">
        <span className="bal-account">
          {account.accountType} · •••• {last4}
        </span>
        <Link to="/top-up" className="bal-add">
          Add money
        </Link>
      </div>

      {suspended && (
        <p className="bal-notice" role="status">
          Your account is suspended. Contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      )}
    </section>
  );
};

export default BalanceCard;