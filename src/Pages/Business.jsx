import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import "./Business.css";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import logo from "../assets/Images/Logo.png";
import { loginUser } from "../Components/userStore";

import checkingImg from "../assets/Images/business-checking.jpg";
import cashManagerImg from "../assets/Images/business-insights.jpg";
import paymentsImg from "../assets/Images/business-payments.jpg";
import insightsImg from "../assets/Images/business-insights.jpg";
import connectedAppsImg from "../assets/Images//business-insights.jpg";
import creditScoresImg from "../assets/Images/business-credit-scores.jpg";

const STORAGE_KEY = "kinvest_user_id";

const REVENUE = [
  { id: "start", label: "I'm just starting out", plan: "Business Essentials", note: "Simple everyday banking for a new business, with no monthly fee for the first 12 months." },
  { id: "1m", label: "Up to $1M", plan: "Business Essentials", note: "Everyday banking for a growing business, with no monthly fee for the first 12 months." },
  { id: "50m", label: "$1M to $50M", plan: "Business Growth", note: "Higher limits and tools for payments, payroll and cash management." },
  { id: "2b", label: "$50M to $2B", plan: "Business Enterprise", note: "A dedicated banker and custom services for larger operations." },
  { id: "more", label: "More than $2B", plan: "Business Enterprise", note: "A dedicated banker and custom services for larger operations." },
];

/* ---------- "I'm interested in" ---------- */
// art: "photo" uses the image, "debit" draws the KinvestBank debit cards, "icon" draws a simple icon
const TOPICS = [
  {
    id: "needs",
    label: "Top business needs",
    cards: [
      {
        title: "Make every move matter with the right business checking account",
        text: "Whether you're starting out or scaling up, our powerful digital tools, plus expertise and guidance, can keep your business moving forward.",
        art: "photo",
        image: checkingImg,
        alt: "Two business owners planning on a whiteboard",
      },
      {
        title: "Business Debit cards",
        text: "Spend straight from your business account. Get a debit card for you and your team, set spending limits, freeze a card in seconds and see every purchase as it happens.",
        art: "debit",
      },
      {
        title: "KinvestBank Cash Manager",
        text: "See your balances, approve payments and track your cash flow in one secure place, on your computer or your phone.",
        art: "photo",
        image: cashManagerImg,
        alt: "Cash manager dashboard on a laptop and phone",
      },
      {
        title: "Payment solutions",
        text: "Our payment tools help money flow smoothly and securely as your business grows.",
        art: "photo",
        image: paymentsImg,
        alt: "Shop owner taking a call while working on a laptop",
      },
    ],
  },
  {
    id: "insights",
    label: "Featured insights",
    cards: [
      {
        title: "Why and how to keep your personal and business finances separate",
        text: "Step-by-step guidance on how to set up your business finances to protect yourself, streamline accounting and build business credit.",
        art: "photo",
        image: insightsImg,
        alt: "A hand placing a red block among wooden blocks",
        link: true,
      },
      {
        title: "Starting a new business?",
        text: "Explore tools, information and products you need to make decisions with confidence.",
        art: "none",
        link: true,
      },
    ],
  },
  {
    id: "solutions",
    label: "Featured solutions",
    columns: true, // two columns of cards with different heights, like the design
    cards: [
      {
        col: 0,
        eyebrow: "KINVESTBANK",
        title: "Kinvest Rewards",
        sub: "For Business",
        text: "Members earn rewards on banking, cards and more, with no fee to join.",
        art: "none",
      },
      {
        col: 0,
        title: "Connected apps",
        text: "View your key business metrics all in one place. Visually track cash flow trends and popular tools in your dashboard.",
        art: "photo",
        fit: "contain",
        image: connectedAppsImg,
        alt: "Business dashboard on a laptop and a phone",
      },
      {
        col: 1,
        title: "Business Growth Center",
        text: "Increase your business knowledge, expand your network and see your growth potential with practical guidance from our resources and insights.",
        art: "none",
        link: true,
      },
      {
        col: 1,
        title: "Business credit scores",
        text: "Lenders, suppliers and insurers may use business credit scores to make decisions about working with you. Keep an eye on your scores with KinvestBank business banking.",
        art: "photo",
        image: creditScoresImg,
        alt: "Two smiling bakery owners holding a tray of cupcakes",
      },
    ],
  },
];

const ART_ICONS = {
  growth: <path d="M4 18l5-5 4 4 7-8M15 9h5v5" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17 14c2.5 0 4.5 2 4.5 4.5" />
    </>
  ),
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  bank: <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />,
};

// one debit card in the picture
const CardShape = ({ id, from, to, ink, x, y, turn }) => (
  <g transform={`translate(${x} ${y}) rotate(${turn})`}>
    <defs>
      <linearGradient id={`bz-card-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <rect width="168" height="106" rx="11" fill={`url(#bz-card-${id})`} />
    <rect width="168" height="106" rx="11" fill="none" stroke="rgba(0,0,0,0.12)" />
    <rect x="14" y="30" width="24" height="18" rx="4" fill="#e8c766" />
    <path d="M14 39h24M26 30v18" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
    <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
      <path d="M48 34a8 8 0 0 1 0 10" />
      <path d="M53 31a13 13 0 0 1 0 16" />
    </g>
    <text x="14" y="21" fill={ink} fontSize="11" fontWeight="700" fontFamily="Poppins, Arial, sans-serif">
      KinvestBank
    </text>
    <text x="14" y="90" fill={ink} fontSize="8" letterSpacing="1.4" fontFamily="Poppins, Arial, sans-serif" opacity="0.85">
      BUSINESS
    </text>
    <text x="154" y="92" textAnchor="end" fill={ink} fontSize="12" fontWeight="700" fontStyle="italic" fontFamily="Poppins, Arial, sans-serif">
      DEBIT
    </text>
  </g>
);

const DebitCardsArt = () => (
  <svg className="bz-debit-art" viewBox="0 0 420 230" role="img" aria-label="KinvestBank business debit cards">
    <CardShape id="a" from="#8a8f99" to="#5b6069" ink="#ffffff" x={22} y={86} turn={-13} />
    <CardShape id="b" from="#d93a4a" to="#a61e2e" ink="#ffffff" x={92} y={78} turn={-13} />
    <CardShape id="c" from="#1c4fb5" to="#0a1d42" ink="#ffffff" x={162} y={70} turn={-13} />
    <CardShape id="d" from="#ffffff" to="#e6e9f0" ink="#0a1d42" x={232} y={62} turn={-13} />
  </svg>
);

const TopicCard = ({ card }) => (
  <article className={`bz-int-card ${card.art === "none" ? "text-only" : ""}`}>
    {card.art !== "none" && (
      <div className={`bz-int-art ${card.art} ${card.fit || ""}`}>
        {card.art === "photo" && <img src={card.image} alt={card.alt} loading="lazy" />}
        {card.art === "debit" && <DebitCardsArt />}
        {card.art === "icon" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {ART_ICONS[card.icon]}
          </svg>
        )}
      </div>
    )}

    <div className="bz-int-body">
      {card.eyebrow ? (
        <div className="bz-int-brand">
          <small>{card.eyebrow}</small>
          <h3>{card.title}</h3>
          <small>{card.sub}</small>
        </div>
      ) : (
        <h3>{card.title}</h3>
      )}
      <p>{card.text}</p>

      {card.link ? (
        <Link to="/signup" className="bz-int-link">
          Open an account
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <Link to="/signup" className="bz-int-btn">
          Open an account
        </Link>
      )}
    </div>
  </article>
);

/* ---------- Page ---------- */
const Business = () => {
  const [topic, setTopic] = useState("needs");
  const navigate = useNavigate();

  // remembered email or User ID (never the password)
  const savedId = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  })();

  const [userId, setUserId] = useState(savedId);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveId, setSaveId] = useState(Boolean(savedId));
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const [revenue, setRevenue] = useState("");
  const [revenueError, setRevenueError] = useState("");
  const [suggestion, setSuggestion] = useState(null);

  // stop the timer if the user leaves the page early
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading || checking) return;
    setError("");
    setChecking(true);

    let customer = null;
    try {
      customer = await loginUser(userId, password);
    } catch (err) {
      // no connection, or too many attempts
      setChecking(false);
      setError(err.message);
      return;
    }
    setChecking(false);

    if (!customer) {
      setError("The User ID or password you entered is incorrect.");
      return;
    }

    try {
      if (saveId) localStorage.setItem(STORAGE_KEY, userId);
      else localStorage.removeItem(STORAGE_KEY);
      sessionStorage.setItem("kinvest_auth", "true");
      sessionStorage.setItem("kinvest_user", customer.email);
    } catch {
      /* storage unavailable, ignore */
    }

    setLoading(true);
    timerRef.current = setTimeout(() => navigate("/homeprofile"), 1800);
  };

  const handleRevenue = (e) => {
    e.preventDefault();
    const chosen = REVENUE.find((r) => r.id === revenue);
    if (!chosen) {
      setRevenueError("Choose the option that fits your business.");
      setSuggestion(null);
      return;
    }
    setRevenueError("");
    setSuggestion(chosen);
  };

  const busy = loading || checking;
  const current = TOPICS.find((t) => t.id === topic);

  return (
    <div className="bz">
      <Navbar />

      {/* ---------- LOGIN LOADING SCREEN ---------- */}
      {loading && (
        <div className="bz-overlay" role="status" aria-live="polite">
          <img src={logo} alt="KinvestBank" className="bz-overlay-logo" />
          <span className="bz-spinner" aria-hidden="true" />
          <p>Logging you in…</p>
        </div>
      )}

      {/* ---------- HERO ---------- */}
      <section className="bz-hero">
        <svg className="bz-wave" viewBox="0 0 900 240" preserveAspectRatio="none" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M-40 ${250 + i * 4} C 240 ${170 - i * 5}, 620 ${40 + i * 9}, 940 ${50 + i * 16}`}
              fill="none"
              stroke={i % 2 === 0 ? "#4f6bff" : "#1c33a6"}
              strokeWidth="9"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* login card */}
        <form className="bz-login" onSubmit={handleLogin} autoComplete="off">
          <div className="bz-login-tab">Business Banking</div>

          <div className="bz-login-body">
            <input
              type="text"
              name="kinvest-business-id"
              placeholder="User ID"
              aria-label="User ID"
              autoComplete="off"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />

            <div className="bz-password">
              <input
                type={showPassword ? "text" : "password"}
                name="kinvest-business-password"
                placeholder="Password"
                aria-label="Password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="bz-login-row">
              <label className="bz-check">
                <input type="checkbox" checked={saveId} onChange={(e) => setSaveId(e.target.checked)} />
                <span>Save User ID</span>
              </label>
              <a href="#" className="bz-link" onClick={(e) => e.preventDefault()}>
                Forgot ID / Password?
              </a>
            </div>

            {error && (
              <p className="bz-error" role="alert">
                {error}
              </p>
            )}

            <Link to="/contact" className="bz-link small">
              Security &amp; Help
            </Link>

            <div className="bz-login-actions">
              <button type="submit" className="bz-btn solid" disabled={busy}>
                {busy ? "Logging in…" : "Log In"}
              </button>
              <Link to="/signup" className="bz-btn outline">
                Open an account
              </Link>
              <Link to="/signup" className="bz-enroll">
                Enroll
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </form>

        {/* offer */}
        <div className="bz-offer">
          <h1>
            Open a new
            <br />
            Business Essentials
            <br />
            Banking account
          </h1>
          <p>Enjoy no monthly fee for the first 12 months.</p>
          <Link to="/signup" className="bz-cta">
            Open an account
          </Link>
        </div>

        {/* price */}
        <div className="bz-price" aria-label="Zero dollars monthly fee for the first 12 months">
          <div className="bz-price-num">
            <sup>$</sup>0
          </div>
          <strong>MONTHLY FEE</strong>
          <span>for the first 12 months</span>
        </div>
      </section>

      {/* ---------- REVENUE ---------- */}
      <section className="bz-revenue" aria-label="Find the right account">
        <form onSubmit={handleRevenue} noValidate>
          <fieldset>
            <legend>Choose the annual revenue that fits your business, and we'll show you ways we can help</legend>

            <div className="bz-radios">
              {REVENUE.map((r) => (
                <label key={r.id} className="bz-radio">
                  <input
                    type="radio"
                    name="revenue"
                    value={r.id}
                    checked={revenue === r.id}
                    onChange={() => {
                      setRevenue(r.id);
                      setRevenueError("");
                    }}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="bz-submit">
            Submit
          </button>
        </form>

        {revenueError && (
          <p className="bz-error light" role="alert">
            {revenueError}
          </p>
        )}

        {suggestion && (
          <div className="bz-suggest" role="status">
            <div>
              <strong>{suggestion.plan}</strong>
              <p>{suggestion.note}</p>
            </div>
            <Link to="/signup" className="bz-btn solid">
              Open an account
            </Link>
          </div>
        )}
      </section>

      {/* ---------- I'M INTERESTED IN ---------- */}
      <section className="bz-interest" aria-labelledby="bz-interest-title">
        <div className="bz-interest-side">
          <h2 id="bz-interest-title">I'm interested in</h2>
          <p>
            Use this tool to find information that matches your needs. Select a topic to learn about specific
            products and resources.
          </p>

          <div className="bz-topics" role="tablist" aria-label="Topics">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`bz-tab-${t.id}`}
                aria-selected={topic === t.id}
                aria-controls="bz-topic-panel"
                className={`bz-topic ${topic === t.id ? "active" : ""}`}
                onClick={() => setTopic(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`bz-interest-grid ${current.columns ? "columns" : ""}`}
          role="tabpanel"
          id="bz-topic-panel"
          aria-labelledby={`bz-tab-${topic}`}
        >
          {current.columns
            ? [0, 1].map((i) => (
                <div className="bz-int-col" key={i}>
                  {current.cards
                    .filter((c) => c.col === i)
                    .map((c) => (
                      <TopicCard key={`${topic}-${c.title}`} card={c} />
                    ))}
                </div>
              ))
            : current.cards.map((c) => <TopicCard key={`${topic}-${c.title}`} card={c} />)}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Business;