import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import "./Signup.css";
import Navbar from "../Components/Navbar";
import EmailCodeDialog from "../Components/EmailCodeDialog";
import { resendSignupCode, startSignup, verifySignup } from "../Components/signupApi";

const accountTypes = [
  "Checking & Savings",
  "Credit Card",
  "Home Loan",
  "Auto Loan",
  "Small Business",
  "Investing",
];

const rules = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "case", label: "Upper and lower case letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num", label: "At least one number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "At least one symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

const emptyAddress = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" };

const addressLines = (a = {}) =>
  [a.line1, a.line2, [a.city, a.state, a.postalCode].filter(Boolean).join(" "), a.country].filter(Boolean);

const initialValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  ...emptyAddress,
  accountType: "",
  userId: "",
  password: "",
  confirm: "",
  agree: false,
};

/* ---------- Validation ---------- */
const validate = (v) => {
  const e = {};
  if (!v.firstName.trim()) e.firstName = "Enter your first name";
  if (!v.lastName.trim()) e.lastName = "Enter your last name";
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Enter a valid email address";
  if (v.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number";
  if (v.line1.trim().length < 5) e.line1 = "Enter your street address";
  if (!v.city.trim()) e.city = "Enter your city";
  if (!v.state.trim()) e.state = "Enter your state or region";
  if (!/^[A-Za-z0-9 -]{3,10}$/.test(v.postalCode.trim()))
    e.postalCode = "Enter a valid postal code";
  if (!v.country.trim()) e.country = "Enter your country";
  if (!v.accountType) e.accountType = "Choose an account type";
  if (!/^[A-Za-z0-9_.-]{6,20}$/.test(v.userId))
    e.userId = "6–20 characters: letters, numbers, . _ -";
  if (!rules.every((r) => r.test(v.password)))
    e.password = "Your password doesn't meet all the requirements";
  if (!v.confirm || v.confirm !== v.password) e.confirm = "Passwords don't match";
  if (!v.agree) e.agree = "You must accept the terms to continue";
  return e;
};

/* ---------- Small field wrapper ---------- */
const Field = ({ label, id, error, children, className = "" }) => (
  <div className={`field ${className} ${error ? "has-error" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {error && (
      <p className="error" role="alert">
        {error}
      </p>
    )}
  </div>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="tick">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

// emails the code (nothing is created yet)
const requestCode = async (form) => {
  try {
    return { ok: true, info: await startSignup(form) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

/* ---------- Page ---------- */
const Signup = () => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [account, setAccount] = useState(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInfo, setCodeInfo] = useState(null);

  const errors = useMemo(() => validate(values), [values]);
  const passed = rules.filter((r) => r.test(values.password)).length;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const err = (name) => ((touched[name] || submitted) && errors[name]) || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (creating) return;
    setSubmitted(true);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setCreating(true);

    // checks the form and emails a 6-digit code. The account is created once the code is entered
    const result = await requestCode({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: {
        line1: values.line1.trim(),
        line2: values.line2.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        postalCode: values.postalCode.trim(),
        country: values.country.trim(),
      },
      accountType: values.accountType,
      userId: values.userId.trim(),
      password: values.password,
    });

    setCreating(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setCodeInfo(result.info);
    setCodeOpen(true);
  };

  // the right code was entered, so the account now exists
  const handleCodeVerified = ({ user }) => {
    setAccount(user);
    setCodeOpen(false);
    setDone(true);
  };

  return (
    <>
      <Navbar />

      <main className="signup">
        <section className="signup-main">
          {done ? (
            <div className="success-card">
              <div className="success-icon">
                <CheckIcon />
              </div>
              <h2>Welcome to KinvestBank, {values.firstName}!</h2>
              <p>Your account is ready. Here are your details:</p>

              {account && (
                <dl className="success-details">
                  <div>
                    <dt>Account number</dt>
                    <dd className="mono">{account.accountNumber}</dd>
                  </div>
                  <div>
                    <dt>Name on card</dt>
                    <dd>{account.card.holder}</dd>
                  </div>
                  <div>
                    <dt>Debit card</dt>
                    <dd>
                      {account.card.brand} •••• {account.card.number.slice(-4)}
                    </dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{addressLines(account.address).join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Card expires</dt>
                    <dd>{account.card.expiry}</dd>
                  </div>
                </dl>
              )}

              <p>
                Your email <strong>{values.email}</strong> is confirmed. You can log in with your
                email or User ID.
              </p>
              <Link to="/" className="btn-primary link-btn">
                Go to log in
              </Link>
            </div>
          ) : (
            <form className="signup-card" onSubmit={handleSubmit} noValidate>
              <h2>Create your account</h2>
              <p className="form-sub">
                Already have an account? <Link to="/">Log in</Link>
              </p>

              <div className="row">
                <Field label="First name" id="firstName" error={err("firstName")}>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={values.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Field>

                <Field label="Last name" id="lastName" error={err("lastName")}>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={values.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Field>
              </div>

              <div className="row">
                <Field label="Email address" id="email" error={err("email")}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Field>

                <Field label="Phone number" id="phone" error={err("phone")}>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={values.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </Field>
              </div>

              <fieldset className="address-group">
                <legend>Home address</legend>

                <Field label="Street address" id="line1" error={err("line1")}>
                  <input id="line1" name="line1" type="text" autoComplete="address-line1"
                    value={values.line1} onChange={handleChange} onBlur={handleBlur} />
                </Field>

                <Field label="Apartment, suite, etc. (optional)" id="line2">
                  <input id="line2" name="line2" type="text" autoComplete="address-line2"
                    value={values.line2} onChange={handleChange} />
                </Field>

                <div className="row">
                  <Field label="City" id="city" error={err("city")}>
                    <input id="city" name="city" type="text" autoComplete="address-level2"
                      value={values.city} onChange={handleChange} onBlur={handleBlur} />
                  </Field>

                  <Field label="State / Region" id="state" error={err("state")}>
                    <input id="state" name="state" type="text" autoComplete="address-level1"
                      value={values.state} onChange={handleChange} onBlur={handleBlur} />
                  </Field>
                </div>

                <div className="row">
                  <Field label="Postal code" id="postalCode" error={err("postalCode")}>
                    <input id="postalCode" name="postalCode" type="text" autoComplete="postal-code"
                      value={values.postalCode} onChange={handleChange} onBlur={handleBlur} />
                  </Field>

                  <Field label="Country" id="country" error={err("country")}>
                    <input id="country" name="country" type="text" autoComplete="country-name"
                      value={values.country} onChange={handleChange} onBlur={handleBlur} />
                  </Field>
                </div>
              </fieldset>

              <Field label="What would you like to open?" id="accountType" error={err("accountType")}>
                <select
                  id="accountType"
                  name="accountType"
                  value={values.accountType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="">Select an account type</option>
                  {accountTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Create a User ID" id="userId" error={err("userId")}>
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  autoComplete="off"
                  value={values.userId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </Field>

              <Field label="Create a password" id="password" error={err("password")}>
                <div className="pw-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>

                {/* strength meter */}
                <div className="meter" aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={n <= passed ? `on s${passed}` : ""} />
                  ))}
                </div>
                <p className="meter-label">
                  {values.password ? strengthLabels[passed] : "Password strength"}
                </p>

                <ul className="rules">
                  {rules.map((r) => (
                    <li key={r.id} className={r.test(values.password) ? "ok" : ""}>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </Field>

              <Field label="Confirm password" id="confirm" error={err("confirm")}>
                <input
                  id="confirm"
                  name="confirm"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </Field>

              <div className={`terms ${err("agree") ? "has-error" : ""}`}>
                <label className="check">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={values.agree}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/service-agreement">Online Banking Service Agreement</Link>{" "}
                    and <Link to="/settings/privacy">Privacy Policy</Link>.
                  </span>
                </label>
                {err("agree") && (
                  <p className="error" role="alert">
                    {err("agree")}
                  </p>
                )}
              </div>

              {formError && (
                <p className="error" role="alert">
                  {formError}
                </p>
              )}

              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Sending your code…" : "Create account"}
              </button>

              <p className="secure-note">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1zm2 0h6V7a3 3 0 0 0-6 0v3z" />
                </svg>
                Your information is encrypted and kept secure.
              </p>
            </form>
          )}
        </section>
      </main>

      <EmailCodeDialog
        open={codeOpen}
        theme="light"
        title="Confirm your email"
        verifyLabel="Create my account"
        initial={codeInfo}
        send={() => resendSignupCode(codeInfo?.email || values.email.trim())}
        confirm={(code) => verifySignup({ email: codeInfo?.email || values.email.trim(), code })}
        onVerified={handleCodeVerified}
        onClose={() => setCodeOpen(false)}
        summary={`Opening a ${values.accountType} account for ${values.email.trim()}`}
      />
    </>
  );
};

export default Signup;