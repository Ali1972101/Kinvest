import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import "./Loan.css";
import Navbar from "../Components/Navbar";
import VerifyDialog from "../Components/VerifyDialog";
import { formatMoney } from "../Components/transferData";
import {
  AMOUNT_STEP,
  EMPLOYMENT,
  LOAN_TYPES,
  MAX_PAYMENT_SHARE,
  PROCESSING_FEE_RATE,
  PURPOSES,
  calcLoan,
  formatTerm,
} from "../Components/loanData";

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  personal: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.6 3.5-6 7-6s6.3 2.4 7 6" />
    </>
  ),
  business: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  education: (
    <>
      <path d="M2 9l10-5 10 5-10 5-10-5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </>
  ),
  auto: (
    <>
      <path d="M5 16l1.5-5a2 2 0 0 1 1.9-1.4h7.2a2 2 0 0 1 1.9 1.4L19 16" />
      <rect x="3" y="16" width="18" height="4" rx="1.5" />
      <path d="M7.5 18h.01M16.5 18h.01" />
    </>
  ),
  note: (
    <>
      <path d="M5 4h14a1 1 0 0 1 1 1v11l-4 4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
};

const Icon = ({ name, className = "" }) => (
  <svg className={`ln-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Setup ---------- */
const STEPS = ["Loan", "About you", "Review"];
const STEP_FIELDS = [[], ["purpose", "employment", "income"], ["consent"]];
const FEE_LABEL = `${Math.round(PROCESSING_FEE_RATE * 1000) / 10}%`;

const initialForm = { purpose: "", employment: "", income: "", consent: false };

const validate = (f) => {
  const e = {};
  if (!f.purpose) e.purpose = "Choose what the loan is for";
  if (!f.employment) e.employment = "Choose your employment status";
  if (!f.income || !(Number(f.income) > 0)) e.income = "Enter your monthly income";
  if (!f.consent) e.consent = "You need to agree before you can submit";
  return e;
};

const makeReference = () =>
  `LN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/* ---------- Small pieces ---------- */
const Field = ({ id, label, error, hint, children }) => (
  <div className={`ln-field ${error ? "has-error" : ""}`}>
    <label htmlFor={`ln-${id}`}>{label}</label>
    {children}
    {hint && !error && <p className="ln-hint">{hint}</p>}
    {error && (
      <p className="ln-error" role="alert">
        {error}
      </p>
    )}
  </div>
);

const Slider = ({ id, label, value, min, max, step, onChange, display, minLabel, maxLabel }) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="ln-slider">
      <div className="ln-slider-head">
        <label htmlFor={id}>{label}</label>
        <strong>{display}</strong>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--pct": `${pct}%` }}
        aria-valuetext={display}
      />

      <div className="ln-slider-scale">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
};

const Estimate = ({ calc, type, months }) => (
  <section className="ln-estimate" aria-label="Loan estimate">
    <p className="ln-est-label">Estimated monthly payment</p>
    <p className="ln-est-amount">{formatMoney(calc.monthly)}</p>
    <p className="ln-est-sub">for {formatTerm(months)}</p>

    <dl>
      <div>
        <dt>Interest rate</dt>
        <dd>{type.rate}% a year</dd>
      </div>
      <div>
        <dt>Total interest</dt>
        <dd>{formatMoney(calc.interest)}</dd>
      </div>
      <div>
        <dt>Total to repay</dt>
        <dd>{formatMoney(calc.total)}</dd>
      </div>
      <div>
        <dt>Processing fee ({FEE_LABEL})</dt>
        <dd>{formatMoney(calc.fee)}</dd>
      </div>
      <div className="receive">
        <dt>You'll receive</dt>
        <dd>{formatMoney(calc.principal - calc.fee)}</dd>
      </div>
    </dl>
  </section>
);

/* ---------- Page ---------- */
const Loan = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [typeId, setTypeId] = useState("personal");
  const [amount, setAmount] = useState(LOAN_TYPES[0].defaultAmount);
  const [months, setMonths] = useState(LOAN_TYPES[0].defaultTerm);
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [tried, setTried] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const type = LOAN_TYPES.find((t) => t.id === typeId);
  const calc = useMemo(() => calcLoan(amount, type.rate, months), [amount, type.rate, months]);
  const errors = useMemo(() => validate(form), [form]);
  const err = (field) => ((touched[field] || tried) && errors[field]) || "";

  const income = Number(form.income);
  const overStretched = income > 0 && calc.monthly / income > MAX_PAYMENT_SHARE;

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true") {
    return <Navigate to="/" replace />;
  }

  /* ----- handlers ----- */
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleBlur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));
  const handleIncome = (e) =>
    setField("income", e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9));

  const changeType = (id) => {
    const next = LOAN_TYPES.find((t) => t.id === id);
    setTypeId(id);
    setAmount(next.defaultAmount);
    setMonths(next.defaultTerm);
  };

  const goBack = () => {
    if (step === 0 || step === 3) navigate("/homeprofile");
    else {
      setStep((s) => s - 1);
      setTried(false);
    }
  };

  const next = () => {
    const bad = STEP_FIELDS[step].filter((f) => errors[f]);
    if (bad.length > 0) {
      setTried(true);
      setTimeout(() => document.getElementById(`ln-${bad[0]}`)?.focus(), 0);
      return;
    }
    setTried(false);
    setStep((s) => s + 1);
  };

  const handleVerified = async () => {
    setVerifyOpen(false);
    setSending(true);

    // Send the application to your server here (over HTTPS). The SERVER must do the credit
    // and affordability checks, work out the real offer, and make the decision.
    await new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 1500);
    });

    setReceipt({
      reference: makeReference(),
      label: type.label,
      amount: calc.principal,
      receive: calc.principal - calc.fee,
      monthly: calc.monthly,
      months,
    });
    setSending(false);
    setStep(3);
  };

  return (
    <>
      <Navbar />
      <div className="ln-page">
      <div className="ln">
        <div className="ln-body">
          {/* ---------- Header ---------- */}
          <header className="ln-header">
            <button type="button" className="ln-round-btn" aria-label="Back" onClick={goBack}>
              <Icon name="back" />
            </button>
            <h1>{step === 3 ? "Application sent" : "Apply for a Loan"}</h1>
            <span aria-hidden="true" />
          </header>

          {/* ---------- Progress ---------- */}
          {step < 3 && (
            <ol className="ln-steps" aria-label="Progress">
              {STEPS.map((label, i) => (
                <li
                  key={label}
                  className={i < step ? "done" : i === step ? "current" : ""}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className="ln-step-dot">
                    {i < step ? <Icon name="check" className="ln-step-check" /> : i + 1}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          )}

          {/* ---------- Step 1: choose and calculate ---------- */}
          {step === 0 && (
            <section aria-label="Loan details">
              <div className="ln-types" role="radiogroup" aria-label="Loan type">
                {LOAN_TYPES.map((t) => (
                  <button
                    type="button"
                    role="radio"
                    key={t.id}
                    aria-checked={typeId === t.id}
                    className={typeId === t.id ? "active" : ""}
                    onClick={() => changeType(t.id)}
                  >
                    <Icon name={t.id} />
                    <strong>{t.label}</strong>
                    <small>{t.rate}% a year</small>
                  </button>
                ))}
              </div>

              <p className="ln-type-hint">{type.hint}</p>

              <Slider
                id="ln-amount"
                label="How much do you need?"
                value={amount}
                min={type.min}
                max={type.max}
                step={AMOUNT_STEP}
                onChange={setAmount}
                display={formatMoney(amount)}
                minLabel={formatMoney(type.min)}
                maxLabel={formatMoney(type.max)}
              />

              <Slider
                id="ln-term"
                label="How long to repay?"
                value={months}
                min={type.minTerm}
                max={type.maxTerm}
                step={1}
                onChange={setMonths}
                display={formatTerm(months)}
                minLabel={`${type.minTerm} months`}
                maxLabel={`${type.maxTerm} months`}
              />

              <Estimate calc={calc} type={type} months={months} />

              <p className="ln-fineprint">
                This is an estimate, not an offer. Your rate and approval depend on a credit
                assessment and on verifying your details.
              </p>
            </section>
          )}

          {/* ---------- Step 2: about you ---------- */}
          {step === 1 && (
            <section aria-label="About you">
              <Field id="purpose" label="What is the loan for?" error={err("purpose")}>
                <div className="ln-input ln-select">
                  <Icon name="note" className="ln-field-icon" />
                  <select
                    id="ln-purpose"
                    value={form.purpose}
                    onChange={(e) => setField("purpose", e.target.value)}
                    onBlur={handleBlur("purpose")}
                    aria-invalid={Boolean(err("purpose"))}
                  >
                    <option value="">Select a purpose</option>
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field id="employment" label="Employment status" error={err("employment")}>
                <div className="ln-input ln-select">
                  <Icon name="business" className="ln-field-icon" />
                  <select
                    id="ln-employment"
                    value={form.employment}
                    onChange={(e) => setField("employment", e.target.value)}
                    onBlur={handleBlur("employment")}
                    aria-invalid={Boolean(err("employment"))}
                  >
                    <option value="">Select your status</option>
                    {EMPLOYMENT.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field
                id="income"
                label="Monthly income (before tax)"
                error={err("income")}
                hint="Include salary and any other regular income."
              >
                <div className="ln-input">
                  <span className="ln-prefix" aria-hidden="true">
                    $
                  </span>
                  <input
                    id="ln-income"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={form.income}
                    onChange={handleIncome}
                    onBlur={handleBlur("income")}
                    aria-invalid={Boolean(err("income"))}
                  />
                </div>
              </Field>

              {overStretched && (
                <p className="ln-warning" role="status">
                  This monthly payment ({formatMoney(calc.monthly)}) is more than{" "}
                  {Math.round(MAX_PAYMENT_SHARE * 100)}% of your income, so your application may
                  not be approved at this amount. You can go back and choose a smaller amount or a
                  longer term.
                </p>
              )}
            </section>
          )}

          {/* ---------- Step 3: review ---------- */}
          {step === 2 && (
            <section aria-label="Review">
              <h2 className="ln-review-title">Check your application</h2>

              <dl className="ln-summary">
                <div>
                  <dt>Loan type</dt>
                  <dd>{type.label}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatMoney(calc.principal)}</dd>
                </div>
                <div>
                  <dt>Repayment period</dt>
                  <dd>{formatTerm(months)}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{form.purpose}</dd>
                </div>
                <div>
                  <dt>Employment</dt>
                  <dd>{form.employment}</dd>
                </div>
                <div>
                  <dt>Monthly income</dt>
                  <dd>{formatMoney(income, "USD")}</dd>
                </div>
              </dl>

              <Estimate calc={calc} type={type} months={months} />

              {overStretched && (
                <p className="ln-warning" role="status">
                  This payment is high compared to your income, so approval is less likely.
                </p>
              )}

              <div className={`ln-check ${err("consent") ? "has-error" : ""}`}>
                <label>
                  <input
                    id="ln-consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setField("consent", e.target.checked)}
                    onBlur={handleBlur("consent")}
                  />
                  <span>
                    I confirm the information I gave is correct, and I agree that KinvestBank may
                    carry out credit and identity checks.
                  </span>
                </label>
                {err("consent") && (
                  <p className="ln-error" role="alert">
                    {err("consent")}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ---------- Done ---------- */}
          {step === 3 && receipt && (
            <section className="ln-done" role="status">
              <span className="ln-done-icon">
                <Icon name="check" />
              </span>
              <h2>We've got your application</h2>
              <p>
                We're reviewing it now and will let you know the decision within 1 business day.
            
              </p>

              <dl className="ln-summary">
                <div>
                  <dt>Reference</dt>
                  <dd className="mono">{receipt.reference}</dd>
                </div>
                <div>
                  <dt>Loan</dt>
                  <dd>
                    {receipt.label}, {formatMoney(receipt.amount)}
                  </dd>
                </div>
                <div>
                  <dt>Repayment period</dt>
                  <dd>{formatTerm(receipt.months)}</dd>
                </div>
                <div>
                  <dt>Estimated monthly payment</dt>
                  <dd>{formatMoney(receipt.monthly)}</dd>
                </div>
              </dl>

              <Link to="/homeprofile" className="ln-primary link">
                Done
              </Link>
            </section>
          )}
        </div>

        {/* ---------- Footer button ---------- */}
        {step < 3 && (
          <footer className="ln-footer">
            <button
              type="button"
              className="ln-primary"
              disabled={sending}
              onClick={step === 2 ? () => setVerifyOpen(true) : next}
            >
              {step === 2 ? "Submit application" : "Continue"}
            </button>
          </footer>
        )}
      </div>

      {/* ---------- Password check before submitting ---------- */}
      <VerifyDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={handleVerified}
        title="Confirm your application"
        description={`Enter your password to submit your ${formatMoney(calc.principal)} ${type.label.toLowerCase()} loan application.`}
      />

      {sending && (
        <div className="ln-sending" role="status" aria-live="polite">
          <span className="ln-spinner" aria-hidden="true" />
          <p>Submitting your application…</p>
        </div>
      )}
      </div>
    </>
  );
};

export default Loan;