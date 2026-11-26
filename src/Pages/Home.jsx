import React, { useEffect, useRef, useState } from "react";
import "./Home.css";
import Navbar from "../Components/Navbar";
import logo from "../assets/Images/Logo.png";
import img1 from "../assets/Images/goal-1.jpg";
import img2 from "../assets/Images/goal-2.jpg";
import img3 from "../assets/Images/goal-3.jpg";
import img4 from "../assets/Images/goal-4.jpg";
import Footer from "../Components/Footer";
import { Link, useNavigate } from "react-router";
import { loginUser } from "../Components/userStore";

const STORAGE_KEY = "kinvest_user_id";

/* ---------- Goal icons ---------- */
const Icon = ({ children }) => (
  <svg className="goal-icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const RewardsIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5" />
  </Icon>
);

const PiggyIcon = () => (
  <Icon>
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
    <path d="M2 9v1c0 1.1.9 2 2 2h1" />
    <path d="M16 11h.01" />
  </Icon>
);

const BankIcon = () => (
  <Icon>
    <line x1="3" x2="21" y1="22" y2="22" />
    <line x1="6" x2="6" y1="18" y2="11" />
    <line x1="10" x2="10" y1="18" y2="11" />
    <line x1="14" x2="14" y1="18" y2="11" />
    <line x1="18" x2="18" y1="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </Icon>
);

const WalletIcon = () => (
  <Icon>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </Icon>
);

const Chevron = ({ direction }) => (
  <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
    <path d={direction === "left" ? "M15 4l-8 8 8 8" : "M9 4l8 8-8 8"} />
  </svg>
);

/* ---------- Goals content ---------- */
const goals = [
  {
    image: img1,
    icon: <RewardsIcon />,
    text: "6 essential questions to ask before choosing a bank rewards program",
    href: "#",
  },
  {
    image: img2,
    icon: <PiggyIcon />,
    text: "How to start saving for your child's future",
    href: "#",
  },
  {
    image: img3,
    icon: <BankIcon />,
    text: "Savings accounts and CDs (certificates of deposit): Which should I choose?",
    href: "#",
  },
  {
    image: img4,
    icon: <WalletIcon />,
    text: "Money Confessions - real people share their experiences and get helpful guidance",
    href: "#",
  },
];

/* ---------- Card data ---------- */
const cards = [
  {
    stat: "6",
    unit: "%",
    label: "cash back offer",
    name: "Cash Rewards",
    theme: "red",
    network: "visa",
    logo: logo,
    offer: ["$200", "online bonus offer"],
  },
  {
    stat: "1.5",
    unit: "%",
    label: "cash back",
    name: "Unlimited Cash Rewards",
    theme: "silver",
    network: "visa",
    logo: logo,
    badge: "Limited-time offer",
    offer: ["$250", "online bonus offer"],
  },
  {
    stat: "1.5",
    unit: "",
    label: "points for every $1",
    name: "Travel Rewards",
    theme: "blue",
    network: "visa",
    logo: logo,
    offer: ["25,000 online", "bonus points offer"],
  },
  {
    stat: "0",
    unit: "%",
    label: "intro APR offer",
    name: "Kinqora Classic",
    theme: "white",
    network: "mastercard",
    logo: logo,
    offer: ["Intro APR offer", "for 21 billing cycles"],
  },
];

/* ---------- Card pieces ---------- */
const CardArt = () => (
  <svg className="card-art" viewBox="0 0 320 202" preserveAspectRatio="none" aria-hidden="true">
    <polygon points="0,202 0,120 320,-10 320,60" fill="rgba(255,255,255,0.12)" />
    <polygon points="0,202 0,160 320,40 320,92" fill="rgba(255,255,255,0.10)" />
    <polygon points="0,30 0,-10 120,-10 320,100 320,150" fill="rgba(0,0,0,0.10)" />
    <polygon points="0,90 320,202 120,202 0,150" fill="rgba(0,0,0,0.14)" />
    <polygon points="140,-10 320,-10 320,70" fill="rgba(255,255,255,0.10)" />
  </svg>
);

const VisaLogo = () => (
  <div className="net visa">
    <svg viewBox="0 0 64 22" role="img" aria-label="Visa">
      <text
        x="0"
        y="18"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="22"
        fontWeight="900"
        fontStyle="italic"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        VISA
      </text>
    </svg>
    <span>Signature</span>
  </div>
);

const MastercardLogo = () => (
  <div className="net mc">
    <svg viewBox="0 0 40 25" role="img" aria-label="Mastercard">
      <circle cx="12.5" cy="12.5" r="12.5" fill="#EB001B" />
      <circle cx="27.5" cy="12.5" r="12.5" fill="#F79E1B" />
      <path d="M20 2.5 A12.5 12.5 0 0 1 20 22.5 A12.5 12.5 0 0 1 20 2.5 Z" fill="#FF5F00" />
    </svg>
  </div>
);

const RecycleIcon = () => (
  <svg className="recycle" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
    <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
    <path d="m14 16-3 3 3 3" />
    <path d="M8.293 13.596 7.196 9.5 3.1 10.598" />
    <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" />
    <path d="m13.378 9.633 4.096 1.098 1.097-4.096" />
  </svg>
);

const CreditCard = ({ theme, badge, logo, network }) => (
  <div className={`credit-card ${theme}`}>
    <CardArt />
    {badge && <span className="badge">{badge}</span>}
    <div className="chip" />
    <svg className="nfc" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8c2 2.5 2 5.5 0 8M10 6c3 3.5 3 8.5 0 12M14 4c4 4.5 4 11.5 0 16" />
    </svg>
    <img className="card-logo" src={logo} alt="Kinqora" />
    <RecycleIcon />
    {network === "visa" ? <VisaLogo /> : <MastercardLogo />}
  </div>
);

/* ---------- Sign-in icons ---------- */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const LockIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const ShieldIcon = () => (
  <svg className="lg-shield" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    <path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

/* ---------- Page ---------- */
const Home = () => {
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

  // stop the timer if the user leaves the page early
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // goals carousel (small screens)
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const next = (i + goals.length) % goals.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading || checking) return;
    setError("");
    setChecking(true);

    // checks the email (or User ID) and password on the server
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
      setError("The email, User ID or password you entered is incorrect.");
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

  const busy = loading || checking;

  return (
    <div>
      <Navbar />

      {/* ---------- LOGIN LOADING SCREEN ---------- */}
      {loading && (
        <div className="login-overlay" role="status" aria-live="polite">
          <img src={logo} alt="Kinqora" className="login-overlay-logo" />
          <span className="login-spinner" aria-hidden="true" />
          <p>Logging you in…</p>
        </div>
      )}

      <section className="hero">
        {/* ---------- LEFT: LOGIN ---------- */}
        <aside className="hero-left">
          <form className="login-card lg" onSubmit={handleLogin} autoComplete="off">
            <div className="lg-head">
              <span className="lg-badge" aria-hidden="true">
                <LockIcon />
              </span>
              <div>
                <h2 className="login-title">Welcome back</h2>
                <p className="login-sub">Sign in to your Kinqora account</p>
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="userId">Email or User ID</label>
              <div className="lg-input">
                <input
                  id="userId"
                  type="text"
                  name="kinvest-user-id"
                  autoComplete="off"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="password">Password</label>
              <div className="lg-input">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="kinvest-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="lg-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="lg-row">
              <label className="check lg-check">
                <input type="checkbox" checked={saveId} onChange={(e) => setSaveId(e.target.checked)} />
                <span>Remember my email</span>
              </label>
              <Link to="/recover" className="lg-forgot">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-btn" disabled={busy}>
              {busy ? (
                <>
                  <span className="login-btn-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <p className="lg-secure">
              <ShieldIcon />
              <span>Kinqora will never ask for your password by phone, text or email.</span>
            </p>

            <div className="divider" />

            <p className="signup-prompt">
              New to Kinqora? <Link to="/signup">Open an account</Link>
            </p>
          </form>

          <Link to="/signup" className="open-account">
            <span className="coin">$</span>
            <span className="open-text">Open an account</span>
            <span className="arrow">→</span>
          </Link>
        </aside>

        {/* ---------- RIGHT: CARDS ---------- */}
        <div className="hero-right">
          <h1>Choose the card that works for you</h1>

          <div className="card-grid">
            {cards.map((c) => (
              <div className="card-col" key={c.name}>
                <div className="stat">
                  {c.stat}
                  {c.unit && <sup>{c.unit}</sup>}
                </div>
                <p className="stat-label">{c.label}</p>
                <p className="no-fee">No annual fee.</p>

                <CreditCard
                  theme={c.theme}
                  badge={c.badge}
                  logo={c.logo}
                  network={c.network}
                />

                <p className="card-name">{c.name}</p>
                <a href="#" className="offer-btn">
                  <strong>{c.offer[0]}</strong>
                  <strong>{c.offer[1]}</strong>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FINANCIAL GOALS ---------- */}
      <section className="goals">
        <h2>Your financial goals matter</h2>
        <p className="goals-sub">
          We can help you achieve them through Kinqora financial education
          and programs that make communities stronger.
        </p>

        <div className="goals-grid" ref={trackRef} onScroll={handleScroll}>
          {goals.map((g) => (
            <a className="goal-card" href={g.href} key={g.text}>
              <img src={g.image} alt="" />
              <div className="goal-caption">
                {g.icon}
                <span>{g.text}</span>
              </div>
            </a>
          ))}
        </div>

        {/* arrows + dots (only shown on small screens) */}
        <div className="goals-controls">
          <button
            type="button"
            className="ctrl-btn boxed"
            aria-label="Previous"
            onClick={() => goTo(index - 1)}
          >
            <Chevron direction="left" />
          </button>

          <div className="dots">
            {goals.map((g, i) => (
              <button
                type="button"
                key={g.text}
                className={`dot ${i === index ? "active" : ""}`}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>

          <button
            type="button"
            className="ctrl-btn"
            aria-label="Next"
            onClick={() => goTo(index + 1)}
          >
            <Chevron direction="right" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;