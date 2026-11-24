import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import "./Loans.css";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

import heroImg from "../assets/Images/loans-hero.png";

/* ---------- Icons ---------- */
const ICONS = {
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  car: (
    <>
      <path d="M3 16v-4l2-5h14l2 5v4M3 12h18" />
      <circle cx="7.5" cy="16.5" r="1.8" />
      <circle cx="16.5" cy="16.5" r="1.8" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />,
  chat: <path d="M4 5h16v11H9l-5 4V5z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

const Icon = ({ name, className = "ln-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

/* ---------- Content ---------- */
const LOANS = [
  {
    id: "personal",
    icon: "person",
    title: "Personal loans",
    text: "Cover a big expense, bring your debts together or fund a life event with one predictable monthly payment.",
  },
  {
    id: "auto",
    icon: "car",
    title: "Auto loans",
    text: "Finance a new or used vehicle with clear terms, so you know exactly what you will pay each month.",
  },
  {
    id: "home",
    icon: "home",
    title: "Home loans",
    text: "Buy your next home or improve the one you have, with guidance from people who know the process.",
  },
  {
    id: "business",
    icon: "briefcase",
    title: "Business loans",
    text: "Fund equipment, stock or growth with financing built around how your business actually runs.",
  },
];

const TRUST = [
  { icon: "clock", text: "A simple online application" },
  { icon: "shield", text: "Clear terms, explained up front" },
  { icon: "chat", text: "Support from real people" },
];

const STEPS = [
  { title: "Log in or open an account", text: "Sign in to your KinvestBank account, or open one online if you are new to us." },
  { title: "Tell us what you need", text: "Choose your loan type and enter a few details about the amount and how you plan to use it." },
  { title: "Review your options", text: "See the terms available to you and compare the monthly payment before you decide." },
  { title: "Accept and manage online", text: "Accept your offer and keep track of your loan from your KinvestBank dashboard." },
];

const FAQS = [
  {
    q: "What do I need to apply?",
    a: "Have a valid photo ID, your contact details and information about your income and employment ready. The application will tell you if anything else is needed for the loan you choose.",
  },
  {
    q: "Do I need a KinvestBank account to apply?",
    a: "Yes. For your security, you need to be logged in to start an application. If you are new to KinvestBank, you can open an account online and come straight back.",
  },
  {
    q: "What is prequalification?",
    a: "Prequalification is a quick first step that gives you an idea of what you may be able to borrow, so you can shop and plan with more confidence before you submit a full application.",
  },
  {
    q: "Is the payment calculator an offer?",
    a: "No. The calculator gives an estimate for illustration only. Your actual rate, term and payment depend on your application and are confirmed if you are approved.",
  },
  {
    q: "Who can I talk to if I have questions?",
    a: "Our team is happy to help. Visit the Contact us page and we will point you to the right person.",
  },
];

/* ---------- Illustration for the prequalification section (drawn in code) ---------- */
const PrequalArt = () => (
  <svg className="ln-prequal-img" viewBox="0 0 360 300" role="img" aria-label="A loan agreement, a calculator and car keys">
    <ellipse cx="190" cy="278" rx="130" ry="12" fill="#0a1d42" opacity="0.08" />

    {/* loan agreement */}
    <g transform="rotate(4 220 150)">
      <rect x="130" y="30" width="170" height="226" rx="10" fill="#ffffff" stroke="#c9d6ee" strokeWidth="2" />
      <rect x="130" y="30" width="170" height="38" rx="10" fill="#163a73" />
      <rect x="130" y="52" width="170" height="16" fill="#163a73" />
      <rect x="148" y="42" width="70" height="8" rx="4" fill="#f4d37d" />
      <rect x="148" y="90" width="134" height="9" rx="4.5" fill="#dbe5f6" />
      <rect x="148" y="112" width="104" height="9" rx="4.5" fill="#dbe5f6" />
      <rect x="148" y="134" width="120" height="9" rx="4.5" fill="#dbe5f6" />
      <rect x="148" y="170" width="134" height="52" rx="8" fill="#eef3fb" stroke="#c9d6ee" />
      <path d="M160 206c10-18 16 6 26-8s14 6 24-4" fill="none" stroke="#163a73" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="148" y="232" width="60" height="8" rx="4" fill="#b88a2a" opacity="0.8" />
    </g>

    {/* calculator */}
    <g transform="rotate(-12 90 190)">
      <rect x="38" y="116" width="112" height="146" rx="12" fill="#0a1d42" />
      <rect x="50" y="128" width="88" height="30" rx="6" fill="#dbe9fb" />
      <text x="132" y="150" textAnchor="end" fontFamily="Poppins, Arial, sans-serif" fontSize="17" fontWeight="600" fill="#0a1d42">
        $ 1,250
      </text>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={50 + col * 30}
            y={170 + row * 28}
            width="24"
            height="20"
            rx="5"
            fill={row === 2 && col === 2 ? "#f4d37d" : "#4f78bd"}
          />
        ))
      )}
    </g>

    {/* car keys */}
    <g transform="rotate(18 300 220)">
      <circle cx="300" cy="190" r="26" fill="none" stroke="#7fa2d8" strokeWidth="5" />
      <rect x="276" y="212" width="44" height="58" rx="12" fill="#163a73" />
      <circle cx="298" cy="232" r="9" fill="#f4d37d" />
      <rect x="291" y="248" width="14" height="10" rx="3" fill="#4f78bd" />
    </g>
  </svg>
);

/* ---------- Calculator maths ---------- */
const monthlyPayment = (amount, annualRate, months) => {
  const r = annualRate / 100 / 12;
  if (!r) return amount / months;
  return (amount * r) / (1 - Math.pow(1 + r, -months));
};

const money = (n, cents = false) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });

const TERMS = [12, 24, 36, 48, 60, 72];

/* ---------- Page ---------- */
const Loans = () => {
  const [amount, setAmount] = useState(15000);
  const [months, setMonths] = useState(48);
  const [rateText, setRateText] = useState("9.0");

  const rate = rateText.trim() === "" ? NaN : Number(rateText);
  const rateOk = Number.isFinite(rate) && rate >= 0 && rate <= 40;

  const result = useMemo(() => {
    if (!rateOk) return null;
    const monthly = monthlyPayment(amount, rate, months);
    const total = monthly * months;
    return { monthly, total, interest: total - amount };
  }, [amount, months, rate, rateOk]);

  return (
    <div className="ln">
      <Navbar />

      {/* ---------- HERO ---------- */}
      <section className="ln-hero" aria-label="Loans">
        <img src={heroImg} alt="A father and his daughter sitting in the back of a car" />
      </section>

      <div className="ln-lock-wrap">
        <div className="ln-lock">
          <div className="ln-lock-main">
            <h1>Borrow with confidence</h1>
            <p>A fast application, clear terms and a decision you can plan around.</p>
            <Link to="/loans/apply" className="ln-apply">
              Apply now
            </Link>
          </div>

          <ul className="ln-trust">
            {TRUST.map((t) => (
              <li key={t.text}>
                <Icon name={t.icon} />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------- LOAN TYPES ---------- */}
      <section className="ln-section" aria-labelledby="ln-types-title">
        <div className="ln-head">
          <span className="ln-eyebrow">Our loans</span>
          <h2 id="ln-types-title">Choose the loan that fits your plans</h2>
          <p>Whatever you are working towards, we have a way to help you get there.</p>
        </div>

        <div className="ln-types">
          {LOANS.map((l) => (
            <article className="ln-type" key={l.id}>
              <span className="ln-type-icon">
                <Icon name={l.icon} />
              </span>
              <h3>{l.title}</h3>
              <p>{l.text}</p>
              <Link to={`/loans/apply?type=${l.id}`} className="ln-type-link">
                Apply now
                <Icon name="arrow" className="ln-arrow" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- PREQUALIFICATION ---------- */}
      <section className="ln-prequal" aria-labelledby="ln-prequal-title">
        <div className="ln-prequal-inner">
          <div className="ln-prequal-text">
            <h2 id="ln-prequal-title">Not ready to apply? Start with a prequalification</h2>
            <p>
              Shop with confidence. In just a few minutes, see what you may be able to borrow, so you can plan
              your next step with more clarity.
            </p>
            <div className="ln-prequal-actions">
              <Link to="/loans/apply?type=prequalify" className="ln-outline">
                Get prequalified
              </Link>
              <a href="#ln-how" className="ln-text-link">
                Learn more
              </a>
            </div>
            <p className="ln-note">* You will need to log in to your KinvestBank account to continue.</p>
          </div>

          <PrequalArt />
        </div>
      </section>

      {/* ---------- CALCULATOR ---------- */}
      <section className="ln-section" aria-labelledby="ln-calc-title">
        <div className="ln-head">
          <span className="ln-eyebrow">Plan ahead</span>
          <h2 id="ln-calc-title">Estimate your monthly payment</h2>
          <p>Adjust the amount, the term and the rate to see how a loan could fit into your budget.</p>
        </div>

        <div className="ln-calc">
          <div className="ln-calc-form">
            <div className="ln-field">
              <div className="ln-field-top">
                <label htmlFor="ln-amount">Loan amount</label>
                <strong>{money(amount)}</strong>
              </div>
              <input
                id="ln-amount"
                type="range"
                min="1000"
                max="100000"
                step="500"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <div className="ln-range-ends">
                <span>$1,000</span>
                <span>$100,000</span>
              </div>
            </div>

            <div className="ln-field">
              <label htmlFor="ln-term">Loan term</label>
              <select id="ln-term" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t} months ({t / 12} {t === 12 ? "year" : "years"})
                  </option>
                ))}
              </select>
            </div>

            <div className="ln-field">
              <label htmlFor="ln-rate">Interest rate for this estimate (% APR)</label>
              <input
                id="ln-rate"
                type="number"
                inputMode="decimal"
                min="0"
                max="40"
                step="0.1"
                value={rateText}
                onChange={(e) => setRateText(e.target.value)}
                aria-invalid={!rateOk}
              />
              {!rateOk && <p className="ln-error">Enter a rate between 0 and 40.</p>}
            </div>
          </div>

          <div className="ln-calc-result" aria-live="polite">
            <span>Estimated monthly payment</span>
            <strong>{result ? money(result.monthly, true) : "—"}</strong>

            <dl>
              <div>
                <dt>Total interest</dt>
                <dd>{result ? money(result.interest) : "—"}</dd>
              </div>
              <div>
                <dt>Total repaid</dt>
                <dd>{result ? money(result.total) : "—"}</dd>
              </div>
            </dl>

            <Link to="/loans/apply" className="ln-apply gold">
              Apply now
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="ln-section" id="ln-how" aria-labelledby="ln-how-title">
        <div className="ln-head">
          <span className="ln-eyebrow">How it works</span>
          <h2 id="ln-how-title">Four simple steps</h2>
          <p>We have kept the process straightforward, so you always know what comes next.</p>
        </div>

        <ol className="ln-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="ln-step-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="ln-section narrow" aria-labelledby="ln-faq-title">
        <div className="ln-head">
          <span className="ln-eyebrow">Questions</span>
          <h2 id="ln-faq-title">Frequently asked questions</h2>
        </div>

        <div className="ln-faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- CLOSING BAND ---------- */}
      <section className="ln-band" aria-label="Get started">
        <div>
          <h2>Ready to get started?</h2>
          <p>Log in to your account and begin your application today.</p>
        </div>
        <Link to="/loans/apply" className="ln-apply gold">
          Apply now
        </Link>
      </section>

      <p className="ln-legal">
        Loan products, rates and terms are subject to credit approval and eligibility requirements. The payment
        calculator provides estimates for illustration only and is not an offer of credit. Your actual rate,
        term and payment may differ.
      </p>

      <Footer />
    </div>
  );
};

export default Loans;