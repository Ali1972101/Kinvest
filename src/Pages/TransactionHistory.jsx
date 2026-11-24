import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import "./TransactionHistory.css";
import { useCurrentUser, useMyTransactions } from "../Components/userStore";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4.2l2.8 1.8" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
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
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9.5v5l4.5-2.5-4.5-2.5z" />
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

const Icon = ({ name, className = "th-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

const FILTERS = [
  { id: "all", label: "All transactions" },
  { id: "in", label: "Money in" },
  { id: "out", label: "Money out" },
];

const tabs = [
  { id: "home", label: "Home", icon: "home", to: "/homeprofile" },
  { id: "cards", label: "My Cards", icon: "wallet", to: "/my-cards" },
  { id: "stats", label: "Statistics", icon: "stats", to: "/statistics" },
  { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
];

const formatAmount = (n) => {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `- $${abs}` : `$${abs}`;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dayLabel = (iso) => {
  const date = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);

  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "Earlier this week";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/* ---------- Page ---------- */
const TransactionHistory = () => {
  const account = useCurrentUser();
  const transactions = useMyTransactions();

  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // close the filter menu on outside click or Esc
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // group the (newest first) transactions by day
  const groups = useMemo(() => {
    const list = [];
    for (const t of transactions) {
      const label = dayLabel(t.at);
      const last = list[list.length - 1];
      if (last && last.label === label) last.items.push(t);
      else list.push({ label, items: [t] });
    }
    return list;
  }, [transactions]);

  const visible = useMemo(() => {
    const shown = showAll ? groups : groups.slice(0, 1); // only the first day until See all
    return shown
      .map((g) => ({
        ...g,
        items: g.items.filter((t) =>
          filter === "all" ? true : filter === "in" ? t.amount > 0 : t.amount < 0
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, showAll, filter]);

  // keep this page for logged-in customers only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  const chooseFilter = (id) => {
    setFilter(id);
    setMenuOpen(false);
  };

  return (
    <div className="th-page">
      <div className="th">
        <div className="th-body">
          {/* ---------- Header ---------- */}
          <header className="th-header">
            <Link to="/homeprofile" className="th-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>

            <h1>Transaction History</h1>

            <div className="th-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className={`th-round-btn ${filter !== "all" ? "active" : ""}`}
                aria-label="Filter transactions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <Icon name="history" />
              </button>

              {menuOpen && (
                <div className="th-menu" role="menu">
                  {FILTERS.map((f) => (
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={filter === f.id}
                      key={f.id}
                      className={filter === f.id ? "selected" : ""}
                      onClick={() => chooseFilter(f.id)}
                    >
                      <span>{f.label}</span>
                      {filter === f.id && <Icon name="check" className="th-menu-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* ---------- Groups ---------- */}
          {transactions.length === 0 && (
            <p className="th-empty">No transactions yet. When you send or receive money, it will appear here.</p>
          )}

          {transactions.length > 0 && visible.length === 0 && (
            <p className="th-empty">No transactions to show.</p>
          )}

          {visible.map((g, index) => (
            <section className="th-group" key={g.label} aria-label={g.label}>
              <div className="th-group-head">
                <h2>{g.label}</h2>

                {index === 0 && groups.length > 1 && (
                  <button
                    type="button"
                    className="th-see-all"
                    onClick={() => setShowAll((s) => !s)}
                  >
                    {showAll ? "Show less" : "See all"}
                  </button>
                )}
              </div>

              <ul className="th-list">
                {g.items.map((t) => (
                  <li className="th-tx" key={t.id}>
                    <span className={`th-tx-icon ${t.tone || ""}`}>
                      <Icon name={t.icon} />
                    </span>

                    <div className="th-tx-info">
                      <strong>{t.name}</strong>
                      <small>{t.category}</small>
                    </div>

                    <span className="th-tx-amount">{formatAmount(t.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* ---------- Bottom tab bar ---------- */}
        <nav className="th-tabbar" aria-label="Main">
          {tabs.map((t) => (
            <Link
              to={t.to}
              key={t.id}
              className={`th-tab ${t.id === "home" ? "active" : ""}`}
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

export default TransactionHistory;