import "./Cards.css";
import React, { useState } from "react";
import { Link, Navigate } from "react-router";
import useCardReveal from "../Components/useCardreveals";
import CardRevealControls from "../Components/CardRevealControls";
import { useCurrentUser, useMyTransactions } from "../Components/userStore";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  transfer: <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />,
  bag: (
    <>
      <path d="M6 7h12l1 13H5L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2.5 11h10L20 7H6.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4z" />
    </>
  ),
  stats: (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

const Icon = ({ name, className = "cards-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

const tabs = [
  { id: "home", label: "Home", icon: "home", to: "/homeprofile" },
  { id: "cards", label: "My Cards", icon: "wallet", to: "/my-cards" },
  { id: "stats", label: "Statistics", icon: "stats", to: "/statistics" },
  { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
];

const LIMIT_MIN = 0;
const LIMIT_MAX = 10000;
const LIMIT_STEP = 100;
const LIMIT_KEY = "kinvest_spending_limit";

const money = (n, decimals = 2) =>
  `$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const signed = (n) => `${n < 0 ? "-" : "+"} ${money(n)}`;

/* ---------- Page ---------- */
const Cards = () => {
  const { revealed, remaining, reveal, hide } = useCardReveal();
  const account = useCurrentUser();
  const transactions = useMyTransactions();

  // saved spending limit (replace with a value from your backend)
  const [limit, setLimit] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(LIMIT_KEY));
      return saved >= LIMIT_MIN && saved <= LIMIT_MAX && saved !== 0 ? saved : 4600;
    } catch {
      return 4600;
    }
  });

  // keep this page for logged-in customers only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  const card = account.card;
  const recent = transactions.slice(0, 3);

  const groups = card.number.split(" ");
  const shown = revealed ? groups : ["••••", "••••", "••••", groups[3]];

  const pct = ((limit - LIMIT_MIN) / (LIMIT_MAX - LIMIT_MIN)) * 100;
  // keeps the value label centred under the thumb (thumb is 22px wide)
  const labelLeft = `calc(${pct}% + ${(0.5 - pct / 100) * 22}px)`;

  const handleLimit = (e) => {
    const value = Number(e.target.value);
    setLimit(value);
    try {
      localStorage.setItem(LIMIT_KEY, String(value));
    } catch {
      /* storage unavailable, ignore */
    }
  };

  return (
    <div className="cards-page">
      <div className="cards">
        <div className="cards-body">
          {/* ---------- Header ---------- */}
          <header className="cards-header">
            <Link to="/homeprofile" className="cards-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>

            <h1>My Cards</h1>

            <Link to="/my-cards/add" className="cards-round-btn" aria-label="Add a card">
              <Icon name="plus" />
            </Link>
          </header>

          {/* ---------- Card ---------- */}
          <section className="cards-card" aria-label="Your card">
            <div className="cards-card-top">
              <div className="cards-chip" />
              <svg className="cards-nfc" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 8c2 2.5 2 5.5 0 8M10 6c3 3.5 3 8.5 0 12M14 4c4 4.5 4 11.5 0 16" />
              </svg>
            </div>

            <div className="cards-number" aria-label="Card number">
              {shown.map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </div>

            <p className="cards-holder">{card.holder}</p>

            <div className="cards-card-bottom">
              <div className="cards-details">
                <div>
                  <small>Expiry Date</small>
                  <strong>{card.expiry}</strong>
                </div>
                <div>
                  <small>CVV</small>
                  <strong>{revealed ? card.cvv : "•••"}</strong>
                </div>
              </div>

              <div className="cards-brand" aria-label={card.brand}>
                <span className="cards-mc">
                  <i className="cards-mc-red" />
                  <i className="cards-mc-orange" />
                </span>
                <span className="cards-brand-name">{card.brand}</span>
              </div>
            </div>
          </section>

          <CardRevealControls
            revealed={revealed}
            remaining={remaining}
            onReveal={reveal}
            onHide={hide}
            number={card.number}
          />

          {/* ---------- Transactions ---------- */}
          {recent.length === 0 ? (
            <p className="cards-empty">No transactions yet. </p>
          ) : (
            <ul className="cards-tx-list">
              {recent.map((t) => (
                <li className="cards-tx" key={t.id}>
                  <span className="cards-tx-icon">
                    <Icon name={t.icon} />
                  </span>

                  <div className="cards-tx-info">
                    <strong>{t.name}</strong>
                    <small>{t.category}</small>
                  </div>

                  <span className="cards-tx-amount">{signed(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* ---------- Monthly spending limit ---------- */}
          <section className="cards-limit" aria-labelledby="limit-title">
            <h2 id="limit-title">Monthly spending limit</h2>

            <div className="cards-limit-box">
              <p className="cards-limit-amount">Balance: {money(account.balance)}</p>

              <div className="cards-slider">
                <input
                  type="range"
                  min={LIMIT_MIN}
                  max={LIMIT_MAX}
                  step={LIMIT_STEP}
                  value={limit}
                  onChange={handleLimit}
                  style={{ "--pct": `${pct}%` }}
                  aria-label="Monthly spending limit"
                  aria-valuetext={money(limit, 0)}
                />
              </div>

              <div className="cards-slider-scale">
                <span>{money(LIMIT_MIN, 0)}</span>
                <span className="cards-slider-value" style={{ left: labelLeft }}>
                  {money(limit, 0)}
                </span>
                <span>{money(LIMIT_MAX, 0)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ---------- Bottom tab bar ---------- */}
        <nav className="cards-tabbar" aria-label="Main">
          {tabs.map((t) => (
            <Link
              to={t.to}
              key={t.id}
              className={`cards-tab ${t.id === "cards" ? "active" : ""}`}
              aria-current={t.id === "cards" ? "page" : undefined}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Cards;