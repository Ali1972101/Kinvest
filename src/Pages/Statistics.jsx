import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import "./Statistics.css";
import Navbar from "../Components/Navbar";
import { useCurrentUser, useMyTransactions } from "../Components/userStore";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
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

const Icon = ({ name, className = "st-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name] || paths.transfer}
  </svg>
);

const tabs = [
  { id: "home", label: "Home", icon: "home", to: "/homeprofile" },
  { id: "cards", label: "My Cards", icon: "wallet", to: "/my-cards" },
  { id: "stats", label: "Statistics", icon: "stats", to: "/statistics" },
  { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
];

/* ---------- Helpers ---------- */
const money = (n, withSign = false) => {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!withSign) return `$${abs}`;
  return `${n < 0 ? "-" : "+"} $${abs}`;
};

const MIN_MONTHS = 6;
const MAX_MONTHS = 12;

// how many months to show: at least six, and far enough back to include the oldest transaction
// (the admin can date a transfer in an earlier month), up to twelve
const monthCountFor = (transactions) => {
  const now = new Date();
  let oldest = Infinity;
  transactions.forEach((t) => {
    const at = new Date(t.at).getTime();
    if (at < oldest) oldest = at;
  });
  if (!Number.isFinite(oldest)) return MIN_MONTHS;

  const d = new Date(oldest);
  const back = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, back + 1));
};

// the last calendar months, ending with this month
const buildMonths = (count) => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      key: d.toLocaleDateString("en-US", { month: "short" }),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      start: d.getTime(),
      end: next.getTime(),
    };
  });
};

// "Nov 20, 2026" (the date the transaction is dated)
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ---------- Chart maths ---------- */
const W = 360;
const H = 200;
const PAD_Y = 26;

const buildPoints = (values) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    // no movement at all gives a flat line across the middle
    y: max === min ? H / 2 : PAD_Y + (1 - (v - min) / (max - min)) * (H - PAD_Y * 2),
  }));
};

// smooth curve through the points (Catmull-Rom converted to cubic Béziers)
const smoothPath = (pts) => {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

/* ---------- Page ---------- */
const Statistics = () => {
  const account = useCurrentUser();
  const transactions = useMyTransactions();
  const [picked, setPicked] = useState(null); // the start of the chosen month, null means this month
  const pillsRef = useRef(null);

  const monthCount = monthCountFor(transactions);
  const months = useMemo(() => buildMonths(monthCount), [monthCount]);
  const found = picked === null ? -1 : months.findIndex((m) => m.start === picked);
  const active = found === -1 ? months.length - 1 : found;

  // keep the chosen month in view when there are more months than fit on the screen
  useEffect(() => {
    const box = pillsRef.current;
    const pill = box?.children[active];
    if (!box || !pill) return;
    box.scrollTo({ left: pill.offsetLeft - (box.clientWidth - pill.offsetWidth) / 2, behavior: "smooth" });
  }, [active, months.length]);

  // the balance at the end of each month, worked back from the real balance
  // using the customer's own transactions (so this month always equals their balance)
  const data = useMemo(() => {
    const balance = account ? account.balance : 0;
    return months.map((m) => {
      const after = transactions
        .filter((t) => new Date(t.at).getTime() >= m.end)
        .reduce((sum, t) => sum + t.amount, 0);
      const items = transactions.filter((t) => {
        const at = new Date(t.at).getTime();
        return at >= m.start && at < m.end;
      });
      return { ...m, balance: Math.round((balance - after) * 100) / 100, items };
    });
  }, [account, transactions, months]);

  const points = useMemo(() => buildPoints(data.map((m) => m.balance)), [data]);
  const line = useMemo(() => smoothPath(points), [points]);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  const current = data[active];
  const p = points[active];
  const isThisMonth = active === data.length - 1;

  return (
    <>
      <Navbar />

      <div className="st-page">
        <div className="st">
          <div className="st-body">
            {/* ---------- Header ---------- */}
            <header className="st-header">
              <Link to="/homeprofile" className="st-round-btn" aria-label="Back">
                <Icon name="back" />
              </Link>

              <h1>Statistics</h1>

              <button type="button" className="st-round-btn" aria-label="Notifications">
                <Icon name="bell" />
              </button>
            </header>

            {/* ---------- Balance ---------- */}
            <section className="st-balance" aria-live="polite">
              <p>{isThisMonth ? "Current Balance" : `Balance at end of ${current.label}`}</p>
              <h2>{money(current.balance)}</h2>
            </section>

            {/* ---------- Chart ---------- */}
            <div className="st-chart">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`Balance chart. ${current.key}: ${money(current.balance)}`}
              >
                <defs>
                  <linearGradient id="stFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a63c9" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#1a63c9" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* vertical guide lines */}
                {points.map((pt, i) => (
                  <line
                    key={data[i].start}
                    className={`st-guide ${i === active ? "on" : ""}`}
                    x1={pt.x}
                    x2={pt.x}
                    y1="0"
                    y2={H}
                  />
                ))}

                <path d={area} fill="url(#stFill)" />
                <path d={line} className="st-line" />

                {/* moving marker */}
                <g
                  className="st-marker"
                  style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
                >
                  <circle r="7" />
                </g>
              </svg>
            </div>

            {/* ---------- Month pills ---------- */}
            <div className="st-months" role="tablist" aria-label="Month" ref={pillsRef}>
              {data.map((m, i) => (
                <button
                  type="button"
                  role="tab"
                  key={m.start}
                  aria-selected={i === active}
                  className={`st-month ${i === active ? "active" : ""}`}
                  onClick={() => setPicked(m.start)}
                  title={m.label}
                >
                  {m.key}
                </button>
              ))}
            </div>

            {/* ---------- Transactions ---------- */}
            <section>
              <div className="st-section-head">
                <h2>Transactions</h2>
                <Link to="/transactions" className="st-see-all">
                  See all
                </Link>
              </div>

              {current.items.length === 0 ? (
                <p className="st-empty">
                  {transactions.length === 0
                    ? "No transactions yet."
                    : `No transactions in ${current.label}.`}
                </p>
              ) : (
                <ul className="st-tx-list">
                  {current.items.map((t) => (
                    <li className="st-tx" key={t.id}>
                      <span className="st-tx-icon">
                        <Icon name={t.icon} />
                      </span>

                      <div className="st-tx-info">
                        <strong>{t.name}</strong>
                        <small>
                          {t.category} · {shortDate(t.at)}
                        </small>
                      </div>

                      <span className={`st-tx-amount ${t.amount > 0 ? "in" : ""}`}>
                        {money(t.amount, true)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---------- Bottom tab bar ---------- */}
          <nav className="st-tabbar" aria-label="Main">
            {tabs.map((t) => (
              <Link
                to={t.to}
                key={t.id}
                className={`st-tab ${t.id === "stats" ? "active" : ""}`}
                aria-current={t.id === "stats" ? "page" : undefined}
              >
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Statistics;