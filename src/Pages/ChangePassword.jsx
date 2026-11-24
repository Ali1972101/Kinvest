import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import "./ChangePassword.css";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

const Icon = ({ name, className = "cp-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Password rules (same as the signup page) ---------- */
const rules = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "case", label: "Upper and lower case letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num", label: "At least one number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "At least one symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

const initialValues = { current: "", next: "", confirm: "" };

const validate = (v) => {
  const e = {};
  if (!v.current) e.current = "Enter your current password";

  if (!v.next) e.next = "Enter a new password";
  else if (!rules.every((r) => r.test(v.next))) e.next = "Your new password doesn't meet all the requirements";
  else if (v.next === v.current) e.next = "Your new password must be different from your current one";

  if (!v.confirm) e.confirm = "Confirm your new password";
  else if (v.confirm !== v.next) e.confirm = "Passwords don't match";

  return e;
};

/* ---------- One password field ---------- */
const PasswordField = ({ id, label, value, onChange, onBlur, autoComplete, error, visible, onToggle, children }) => (
  <div className={`cp-field ${error ? "has-error" : ""}`}>
    <label htmlFor={id}>{label}</label>

    <div className="cp-input">
      <Icon name="lock" className="cp-field-icon" />
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="••••••••"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button
        type="button"
        className="cp-eye"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={onToggle}
      >
        <Icon name={visible ? "eyeOff" : "eye"} />
      </button>
    </div>

    {error && (
      <p className="cp-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    )}

    {children}
  </div>
);

/* ---------- Page ---------- */
const ChangePassword = () => {
  const [values, setValues] = useState(initialValues);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const errors = useMemo(() => validate(values), [values]);
  const passed = rules.filter((r) => r.test(values.next)).length;
  const err = (field) => ((touched[field] || submitted) && errors[field]) || "";

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true") {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);

    const first = Object.keys(errors)[0];
    if (first) {
      setTimeout(() => document.getElementById(first)?.focus(), 0);
      return;
    }

    setSaving(true);

    // Send the passwords to your server over HTTPS here. The SERVER must check that the
    // current password is correct, then store only a hash of the new one.
    // Never log or store the passwords in the browser.
    await new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 1200);
    });

    // wipe the passwords from the page
    setValues(initialValues);
    setShow({ current: false, next: false, confirm: false });
    setTouched({});
    setSubmitted(false);
    setSaving(false);
    setDone(true);
  };

  const confirmState =
    !values.confirm ? "idle" : values.confirm === values.next ? "match" : "mismatch";

  return (
    <div className="cp-page">
      <div className="cp">
        <div className="cp-body">
          {/* ---------- Header ---------- */}
          <header className="cp-header">
            <Link to="/settings" className="cp-round-btn" aria-label="Back">
              <Icon name="back" />
            </Link>
            <h1>Change Password</h1>
            <span aria-hidden="true" />
          </header>

          {done ? (
            /* ---------- Success ---------- */
            <section className="cp-success" role="status">
              <span className="cp-success-icon">
                <Icon name="check" />
              </span>
              <h2>Password updated</h2>
              <p>Your password has been changed. Use your new password the next time you log in.</p>
              <Link to="/settings" className="cp-submit link">
                Back to Settings
              </Link>
            </section>
          ) : (
            /* ---------- Form ---------- */
            <form onSubmit={handleSubmit} noValidate>
              <PasswordField
                id="current"
                label="Current Password"
                autoComplete="current-password"
                value={values.current}
                onChange={handleChange}
                onBlur={handleBlur}
                error={err("current")}
                visible={show.current}
                onToggle={() => toggle("current")}
              />

              <PasswordField
                id="next"
                label="New Password"
                autoComplete="new-password"
                value={values.next}
                onChange={handleChange}
                onBlur={handleBlur}
                error={err("next")}
                visible={show.next}
                onToggle={() => toggle("next")}
              >
                {values.next && (
                  <>
                    <div className="cp-meter" aria-hidden="true">
                      {[1, 2, 3, 4].map((n) => (
                        <span key={n} className={n <= passed ? `on s${passed}` : ""} />
                      ))}
                    </div>
                    <p className="cp-meter-label">{strengthLabels[passed]}</p>
                  </>
                )}

                <ul className="cp-rules">
                  {rules.map((r) => (
                    <li key={r.id} className={r.test(values.next) ? "ok" : ""}>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </PasswordField>

              <PasswordField
                id="confirm"
                label="Confirm New Password"
                autoComplete="new-password"
                value={values.confirm}
                onChange={handleChange}
                onBlur={handleBlur}
                error={err("confirm")}
                visible={show.confirm}
                onToggle={() => toggle("confirm")}
              >
                {!err("confirm") && (
                  <p className={`cp-hint ${confirmState}`}>
                    {confirmState === "match" ? "Passwords match" : "Both Passwords Must Match"}
                  </p>
                )}
              </PasswordField>

              <button type="submit" className="cp-submit" disabled={saving}>
                {saving ? (
                  <>
                    <span className="cp-spinner" aria-hidden="true" />
                    Updating…
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;