import React from "react";
import { Link, Navigate } from "react-router";
import "./Homeprofile.css";
import useCardReveal from "../Components/useCardreveals";
import CardRevealControls from "../Components/CardRevealControls";
import BalanceCard from "../Components/BalanceCard";
import {
  fullName,
  useAvatar,
  useCurrentUser,
  useMyTransactions,
} from "../Components/userStore";

/* ---------- Icons ---------- */
const paths = {
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  loan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5" />
    </>
  ),
  topup: (
    <>
      <path d="M16 16l-4-4-4 4M12 12v9" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </>
  ),
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
  transfer: <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />,
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

const Icon = ({ name, className = "dash-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Data ---------- */
// every action opens its own page
const actions = [
  { label: "Send", icon: "up", to: "/send" },
  { label: "Receive", icon: "down", to: "/receive" },
  { label: "Loan", icon: "loan", to: "/loan" },
  { label: "Top up", icon: "topup", to: "/top-up" },
];

const tabs = [
  { id: "home", label: "Home", icon: "home", to: "/homeprofile" },
  { id: "cards", label: "My Cards", icon: "wallet", to: "/my-cards" },
  { id: "stats", label: "Statistics", icon: "stats", to: "/statistics" },
  { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
];

const formatAmount = (n) =>
  `${n < 0 ? "-" : "+"} $${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();


const HomeProfile = () => {
  const { revealed, remaining, reveal, hide } = useCardReveal();
  const account = useCurrentUser();
  const transactions = useMyTransactions();
  const photo = useAvatar(); 

  
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  const card = account.card;
  const name = fullName(account);
  const recent = transactions.slice(0, 4);

  const groups = card.number.split(" ");
  const shown = revealed ? groups : ["••••", "••••", "••••", groups[3]];

  return (
    <div className="dash-page">
      <div className="dash">
        <div className="dash-body">
        
          <header className="dash-header">
            <div className="dash-avatar">
              {photo ? <img src={photo} alt="" /> : <span>{initials(name)}</span>}
            </div>

            <div className="dash-welcome">
              <p>Welcome back,</p>
              <h1>{account.firstName || name}</h1>
            </div>

            <Link to="/search" className="dash-round-btn" aria-label="Search">
              <Icon name="search" />
            </Link>
          </header>

          {/* ---------- Account balance ---------- */}
          <BalanceCard />

          {/* ---------- Card ---------- */}
          <section className="dash-card" aria-label="Your card">
            <div className="dash-card-top">
              <div className="dash-chip" />
              <svg className="dash-nfc" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 8c2 2.5 2 5.5 0 8M10 6c3 3.5 3 8.5 0 12M14 4c4 4.5 4 11.5 0 16" />
              </svg>
            </div>

            <div className="dash-number" aria-label="Card number">
              {shown.map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </div>

            <p className="dash-holder">{card.holder}</p>

            <div className="dash-card-bottom">
              <div className="dash-details">
                <div>
                  <small>Expiry Date</small>
                  <strong>{card.expiry}</strong>
                </div>
                <div>
                  <small>CVV</small>
                  <strong>{revealed ? card.cvv : "•••"}</strong>
                </div>
              </div>

              <div className="dash-brand" aria-label={card.brand}>
                <span className="dash-mc">
                  <i className="dash-mc-red" />
                  <i className="dash-mc-orange" />
                </span>
                <span className="dash-brand-name">mastercard</span>
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

          {/* ---------- Quick actions ---------- */}
          <nav className="dash-actions" aria-label="Quick actions">
            {actions.map((a) => (
              <Link to={a.to} className="dash-action" key={a.label}>
                <span className="dash-action-icon">
                  <Icon name={a.icon} />
                </span>
                <span>{a.label}</span>
              </Link>
            ))}
          </nav>

          {/* ---------- Transactions ---------- */}
          <section>
            <div className="dash-section-head">
              <h2>Transactions</h2>
              <Link to="/transactions" className="dash-see-all">
                See all
              </Link>
            </div>

            {recent.length === 0 ? (
              <p className="dash-empty">No transactions yet. </p>
            ) : (
              <ul className="dash-tx-list">
                {recent.map((t) => (
                  <li className="dash-tx" key={t.id}>
                    <span className="dash-tx-icon">
                      <Icon name={t.icon} />
                    </span>

                    <div className="dash-tx-info">
                      <strong>{t.name}</strong>
                      <small>{t.category}</small>
                    </div>

                    <span className={`dash-tx-amount ${t.amount > 0 ? "in" : ""}`}>
                      {formatAmount(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- Bottom tab bar ---------- */}
        <nav className="dash-tabbar" aria-label="Main">
          {tabs.map((t) => (
            <Link
              to={t.to}
              key={t.id}
              className={`dash-tab ${t.id === "home" ? "active" : ""}`}
              aria-current={t.id === "home" ? "page" : undefined}
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

export default HomeProfile;