import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import "./AddCards.css";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  person: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.3 18.2c1.2-2 3.4-3.2 5.7-3.2s4.5 1.2 5.7 3.2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

const Icon = ({ name, className = "ac-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Card helpers ---------- */
const BRANDS = {
  visa: { name: "Visa", length: 16, cvv: 3, groups: [4, 4, 4, 4] },
  mastercard: { name: "Mastercard", length: 16, cvv: 3, groups: [4, 4, 4, 4] },
  amex: { name: "American Express", length: 15, cvv: 4, groups: [4, 6, 5] },
  discover: { name: "Discover", length: 16, cvv: 3, groups: [4, 4, 4, 4] },
  unknown: { name: "Card", length: 16, cvv: 3, groups: [4, 4, 4, 4] },
};

const digitsOnly = (s) => s.replace(/\D/g, "");

const detectBrand = (digits) => {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  return "unknown";
};

const formatNumber = (digits, brand) => {
  const parts = [];
  let i = 0;
  for (const size of BRANDS[brand].groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
};

// the standard checksum every real card number passes
const luhn = (digits) => {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
};

const formatExpiry = (raw) => {
  let d = digitsOnly(raw).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`; // typing 5 becomes 05
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const expiryProblem = (value) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return "Enter the expiry date as MM/YY";
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return "Enter a valid month (01 to 12)";

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  if (year < thisYear || (year === thisYear && month < thisMonth)) return "This card has expired";
  if (year > thisYear + 20) return "Enter a valid expiry year";
  return "";
};

const validate = (v, brand) => {
  const e = {};
  const digits = digitsOnly(v.number);

  if (v.name.trim().length < 2) e.name = "Enter the name on the card";

  if (!digits) e.number = "Enter your card number";
  else if (digits.length !== BRANDS[brand].length || !luhn(digits))
    e.number = "This card number doesn't look right";

  const expiry = expiryProblem(v.expiry);
  if (expiry) e.expiry = expiry;

  if (v.cvv.length !== BRANDS[brand].cvv)
    e.cvv = `Enter the ${BRANDS[brand].cvv}-digit security code`;

  return e;
};

/* ---------- Brand logo ---------- */
const BrandLogo = ({ brand, small = false }) => {
  if (brand === "mastercard")
    return (
      <span className={`ac-mc ${small ? "small" : ""}`} aria-label="Mastercard">
        <i className="ac-mc-red" />
        <i className="ac-mc-orange" />
      </span>
    );
  if (brand === "visa")
    return <span className={`ac-word visa ${small ? "small" : ""}`}>VISA</span>;
  if (brand === "amex")
    return <span className={`ac-word amex ${small ? "small" : ""}`}>AMEX</span>;
  if (brand === "discover")
    return <span className={`ac-word discover ${small ? "small" : ""}`}>DISCOVER</span>;
  return null;
};

/* ---------- Page ---------- */
const initialValues = { name: "", number: "", expiry: "", cvv: "" };

const AddCards = () => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(null); // { brand, last4 }
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const digits = digitsOnly(values.number);
  const brand = detectBrand(digits);
  const info = BRANDS[brand];

  const errors = useMemo(() => validate(values, brand), [values, brand]);
  const err = (field) => ((touched[field] || submitted) && errors[field]) || "";

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true") {
    return <Navigate to="/" replace />;
  }

  /* ----- input handlers ----- */
  const setField = (field, value) => setValues((v) => ({ ...v, [field]: value }));

  const handleName = (e) => setField("name", e.target.value.replace(/[^\p{L} .'-]/gu, ""));

  const handleNumber = (e) => {
    const raw = digitsOnly(e.target.value);
    const b = detectBrand(raw);
    setField("number", formatNumber(raw.slice(0, BRANDS[b].length), b));
  };

  const handleExpiry = (e) => setField("expiry", formatExpiry(e.target.value));

  const handleCvv = (e) => setField("cvv", digitsOnly(e.target.value).slice(0, info.cvv));

  const handleBlur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);

    if (Object.keys(errors).length > 0) {
      setTimeout(() => document.querySelector(".ac-field.has-error input")?.focus(), 0);
      return;
    }

    setSaving(true);

    // Connect to your payment provider here. Send the card details to the provider
    // (for example with their hosted card fields) and keep only the token it returns.
    // Never save the full number or the CVV yourself.
    await new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 1200);
    });

    setAdded({ brand, last4: digits.slice(-4) });
    setValues(initialValues); // wipe the card details from the page
    setSaving(false);
  };

  /* ----- what the preview card shows ----- */
  const groups = info.groups;
  let offset = 0;
  const previewGroups = groups.map((size) => {
    const chunk = digits.slice(offset, offset + size);
    offset += size;
    return chunk.padEnd(size, "•");
  });

  return (
    <div className="ac-page">
      <div className="ac">
        <div className="ac-body">
          {/* ---------- Header ---------- */}
          <header className="ac-header">
            <Link to="/my-cards" className="ac-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>
            <h1>Add New Card</h1>
            <span aria-hidden="true" />
          </header>

          {/* ---------- Live card preview ---------- */}
          <section className="ac-card" aria-label="Card preview">
            <div className="ac-card-top">
              <div className="ac-chip" />
              <svg className="ac-nfc" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 8c2 2.5 2 5.5 0 8M10 6c3 3.5 3 8.5 0 12M14 4c4 4.5 4 11.5 0 16" />
              </svg>
            </div>

            <div className="ac-number">
              {previewGroups.map((g, i) => (
                <span key={i} className={g.includes("•") ? "dim" : ""}>
                  {g}
                </span>
              ))}
            </div>

            <p className="ac-holder">{values.name.trim().toUpperCase() || "CARDHOLDER NAME"}</p>

            <div className="ac-card-bottom">
              <div className="ac-details">
                <div>
                  <small>Expiry Date</small>
                  <strong>{values.expiry || "MM/YY"}</strong>
                </div>
                <div>
                  <small>CVV</small>
                  <strong>{values.cvv ? "•".repeat(values.cvv.length) : "•••"}</strong>
                </div>
              </div>

              <div className="ac-brand">
                <BrandLogo brand={brand === "unknown" ? "mastercard" : brand} />
                <span className="ac-brand-name">
                  {brand === "unknown" ? "Mastercard" : info.name}
                </span>
              </div>
            </div>
          </section>

          {added ? (
            /* ---------- Success ---------- */
            <section className="ac-success" role="status">
              <span className="ac-success-icon">
                <Icon name="check" />
              </span>
              <h2>Card added</h2>
              <p>
                Your {BRANDS[added.brand].name} card ending in <strong>{added.last4}</strong> was
                added successfully.
              </p>
              <Link to="/my-cards" className="ac-save link">
                Back to My Cards
              </Link>
            </section>
          ) : (
            /* ---------- Form ---------- */
            <form id="add-card-form" onSubmit={handleSubmit} noValidate>
              <div className={`ac-field ${err("name") ? "has-error" : ""}`}>
                <label htmlFor="cardName">Cardholder Name</label>
                <div className="ac-input">
                  <Icon name="person" className="ac-field-icon" />
                  <input
                    id="cardName"
                    type="text"
                    autoComplete="cc-name"
                    placeholder="Name on card"
                    value={values.name}
                    onChange={handleName}
                    onBlur={handleBlur("name")}
                    aria-invalid={Boolean(err("name"))}
                  />
                </div>
                {err("name") && (
                  <p className="ac-error" role="alert">
                    {err("name")}
                  </p>
                )}
              </div>

              <div className="ac-row">
                <div className={`ac-field ${err("expiry") ? "has-error" : ""}`}>
                  <label htmlFor="cardExpiry">Expiry Date</label>
                  <div className="ac-input">
                    <input
                      id="cardExpiry"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={values.expiry}
                      onChange={handleExpiry}
                      onBlur={handleBlur("expiry")}
                      aria-invalid={Boolean(err("expiry"))}
                    />
                  </div>
                  {err("expiry") && (
                    <p className="ac-error" role="alert">
                      {err("expiry")}
                    </p>
                  )}
                </div>

                <div className={`ac-field ${err("cvv") ? "has-error" : ""}`}>
                  <label htmlFor="cardCvv">{info.cvv}-digit CVV</label>
                  <div className="ac-input">
                    <input
                      id="cardCvv"
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder={"•".repeat(info.cvv)}
                      maxLength={info.cvv}
                      value={values.cvv}
                      onChange={handleCvv}
                      onBlur={handleBlur("cvv")}
                      aria-invalid={Boolean(err("cvv"))}
                    />
                  </div>
                  {err("cvv") && (
                    <p className="ac-error" role="alert">
                      {err("cvv")}
                    </p>
                  )}
                </div>
              </div>

              <div className={`ac-field ${err("number") ? "has-error" : ""}`}>
                <label htmlFor="cardNumber">Card Number</label>
                <div className="ac-input">
                  <Icon name="card" className="ac-field-icon" />
                  <input
                    id="cardNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    value={values.number}
                    onChange={handleNumber}
                    onBlur={handleBlur("number")}
                    aria-invalid={Boolean(err("number"))}
                  />
                  <BrandLogo brand={brand} small />
                </div>
                {err("number") && (
                  <p className="ac-error" role="alert">
                    {err("number")}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ---------- Footer ---------- */}
        {!added && (
          <footer className="ac-footer">
            <button type="submit" form="add-card-form" className="ac-save" disabled={saving}>
              {saving ? (
                <>
                  <span className="ac-spinner" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Add card"
              )}
            </button>
            <p className="ac-secure">Your card details are sent securely and are never stored on this page.</p>
          </footer>
        )}
      </div>
    </div>
  );
};

export default AddCards;