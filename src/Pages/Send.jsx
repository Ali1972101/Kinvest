import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import "./Send.css";
import VerifyDialog from "../Components/VerifyDialog";
import EmailCodeDialog from "../Components/EmailCodeDialog";
import TransferCodesDialog from "../Components/TransferCodesDialog";
import { getTransferAuthorization } from "../Components/authorizationApi";
import { confirmTransferCode, sendTransferCode } from "../Components/transferCodeApi";
import {
  COUNTRIES,
  DOMESTIC_FEE,
  INTERNATIONAL_FEE,
  MIN_DOMESTIC,
  MIN_INTERNATIONAL,
  PURPOSES,
  US_STATES,
  formatMoney,
  formatRate,
  getQuote,
  isValidIban,
  isValidRoutingNumber,
  isValidSwift,
} from "../Components/transferData";
import {
  SUPPORT_EMAIL,
  recordBlockedTransfer,
  sendTransfer,
  useCurrentUser,
} from "../Components/userStore";

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
  bank: <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  hash: <path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16" />,
  note: (
    <>
      <path d="M5 4h14a1 1 0 0 1 1 1v11l-4 4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

const Icon = ({ name, className = "" }) => (
  <svg className={`sd-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Setup ---------- */
const TYPES = [
  {
    id: "domestic",
    label: "Domestic",
    hint: `${formatMoney(DOMESTIC_FEE)} fee · within the country`,
    icon: "bank",
  },
  {
    id: "international",
    label: "International",
    hint: `${formatMoney(INTERNATIONAL_FEE)} fee · to another country`,
    icon: "globe",
  },
];

const STEPS = ["Recipient", "Amount", "Review"];

const STEP_FIELDS = [
  ["name", "bank", "routing", "account", "bankAddress", "bankCity", "bankState", "bankZip", "country", "swift"],
  ["amount", "purpose"],
];

const initialForm = {
  name: "",
  bank: "",
  routing: "",
  account: "",
  bankAddress: "",
  bankCity: "",
  bankState: "",
  bankZip: "",
  country: "",
  swift: "",
  amount: "",
  purpose: "",
  note: "",
};

/* ---------- Helpers ---------- */
const formatAccount = (raw, type, country) => {
  if (type === "domestic") return raw.replace(/\D/g, "").slice(0, 10);

  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (country?.iban) return clean.slice(0, 34).replace(/(.{4})/g, "$1 ").trim();
  return clean.slice(0, 34);
};

const cleanAmount = (raw) => {
  let v = raw.replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return v.replace(/^0+(?=\d)/, "").slice(0, 10);
};

const mask = (value) => {
  const c = value.replace(/\s/g, "");
  return c.length > 4 ? `•••• ${c.slice(-4)}` : c;
};

const validateRecipient = (f, type, country) => {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Enter the recipient's full name";
  if (f.bank.trim().length < 2) e.bank = "Enter the recipient's bank";

  if (type === "domestic") {
    if (!/^\d{9}$/.test(f.routing)) e.routing = "Enter the 9-digit routing number";
    else if (!isValidRoutingNumber(f.routing)) e.routing = "This routing number doesn't look right. Please check it.";
    if (!/^\d{10}$/.test(f.account)) e.account = "Enter the 10-digit account number";
    if (f.bankAddress.trim().length < 5) e.bankAddress = "Enter the bank's street address";
    if (f.bankCity.trim().length < 2) e.bankCity = "Enter the bank's city";
    if (!f.bankState) e.bankState = "Choose the state";
    if (!/^\d{5}(-\d{4})?$/.test(f.bankZip)) e.bankZip = "Enter a valid ZIP code";
  } else {
    if (!f.country) e.country = "Choose the destination country";
    if (country?.iban) {
      if (!isValidIban(f.account)) e.account = "This IBAN doesn't look right. Please check it.";
    } else if (!/^[A-Z0-9]{6,34}$/.test(f.account)) {
      e.account = "Enter the recipient's account number";
    }
    if (!isValidSwift(f.swift)) e.swift = "Enter a valid SWIFT/BIC code (8 or 11 characters)";
    if (f.bankAddress.trim().length < 5) e.bankAddress = "Enter the bank's street address";
    if (f.bankCity.trim().length < 2) e.bankCity = "Enter the bank's city";
    if (f.bankZip.trim().length < 3) e.bankZip = "Enter the bank's postal code";
  }
  return e;
};

const validateAmount = (f, type, quote, balance) => {
  const e = {};
  const amount = Number(f.amount);
  const min = type === "international" ? MIN_INTERNATIONAL : MIN_DOMESTIC;

  if (!f.amount || !(amount > 0)) e.amount = "Enter an amount";
  else if (amount < min) e.amount = `The minimum is ${formatMoney(min)}`;
  else if (quote.total > balance)
    e.amount = "You don't have enough balance for this transfer and its fee";

  if (type === "international" && !f.purpose) e.purpose = "Choose the reason for this transfer";
  return e;
};

/* ---------- Small pieces ---------- */
const Field = ({ id, label, error, hint, children }) => (
  <div className={`sd-field ${error ? "has-error" : ""}`}>
    <label htmlFor={`sd-${id}`}>{label}</label>
    {children}
    {hint && !error && <p className="sd-hint">{hint}</p>}
    {error && (
      <p className="sd-error" role="alert">
        {error}
      </p>
    )}
  </div>
);

const QuoteList = ({ quote, type }) => (
  <dl className="sd-quote">
    <div>
      <dt>You send</dt>
      <dd>{formatMoney(quote.amount)}</dd>
    </div>
    <div>
      <dt>Transfer fee</dt>
      <dd>{quote.fee === 0 ? "Free" : formatMoney(quote.fee)}</dd>
    </div>
    {type === "international" && (
      <div>
        <dt>Exchange rate</dt>
        <dd>{formatRate(quote.rate, quote.currency)}</dd>
      </div>
    )}
    <div className="total">
      <dt>Total to be debited</dt>
      <dd>{formatMoney(quote.total)}</dd>
    </div>
    <div className="receive">
      <dt>Recipient gets</dt>
      <dd>{formatMoney(quote.receive, quote.currency)}</dd>
    </div>
  </dl>
);

/* ---------- Page ---------- */
const Send = () => {
  const navigate = useNavigate();

  // the customer's live account (balance and status come from the server)
  const account = useCurrentUser();
  const accountId = account?.id;
  const suspended = account?.status === "suspended";
  const balance = account ? account.balance : 0;
  const reported = useRef(false);

  const [type, setType] = useState("domestic");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [tried, setTried] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [sendError, setSendError] = useState("");
  // the checks before the password: the admin's COT / TAC codes, then the code we email
  const [authOpen, setAuthOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState([]);
  const [codeOpen, setCodeOpen] = useState(false);
  const [checkingCodes, setCheckingCodes] = useState(false);
  const authProofRef = useRef(null);
  const emailProofRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // the server records blocked attempts itself, so this does nothing now
  useEffect(() => {
    if (suspended && accountId && !reported.current) {
      reported.current = true;
      recordBlockedTransfer(accountId);
    }
  }, [suspended, accountId]);

  const country = COUNTRIES.find((c) => c.code === form.country);
  const currency = type === "international" ? country?.currency || "USD" : "USD";

  const quote = useMemo(
    () => getQuote(Number(form.amount), type, currency),
    [form.amount, type, currency]
  );

  const errors = useMemo(
    () => ({
      ...validateRecipient(form, type, country),
      ...validateAmount(form, type, quote, balance),
    }),
    [form, type, country, quote, balance]
  );

  const err = (field) => ((touched[field] || tried) && errors[field]) || "";

  // keep this page for logged-in customers only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  // a suspended customer sees only this message, and no transfer can start
  if (suspended) {
    return (
      <div className="sd-page">
        <div className="sd">
          <div className="sd-body">
            <header className="sd-header">
              <button
                type="button"
                className="sd-round-btn"
                aria-label="Back"
                onClick={() => navigate("/homeprofile")}
              >
                <Icon name="back" />
              </button>
              <h1>Send Money</h1>
              <span aria-hidden="true" />
            </header>

            <section className="sd-suspended" role="alert">
              <span className="sd-suspended-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              </span>
              <h2>Your account has been suspended</h2>
              <p>
                You can't send money right now. Please contact us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
              <Link to="/homeprofile" className="sd-primary link">
                Back to home
              </Link>
            </section>
          </div>
        </div>
      </div>
    );
  }

  /* ----- handlers ----- */
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleBlur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));

  const handleName = (e) =>
    setField("name", e.target.value.replace(/[^\p{L} .'-]/gu, "").slice(0, 60));
  const handleBank = (e) => setField("bank", e.target.value.slice(0, 60));
  const handleAccount = (e) => setField("account", formatAccount(e.target.value, type, country));
  const handleRouting = (e) => setField("routing", e.target.value.replace(/\D/g, "").slice(0, 9));
  const handleBankAddress = (e) => setField("bankAddress", e.target.value.slice(0, 80));
  const handleBankCity = (e) =>
    setField("bankCity", e.target.value.replace(/[^\p{L} .'-]/gu, "").slice(0, 60));
  const handleBankRegion = (e) => setField("bankState", e.target.value.replace(/[^\p{L} .'-]/gu, "").slice(0, 60));
  const handleBankPostal = (e) =>
    setField("bankZip", e.target.value.replace(/[^A-Za-z0-9 -]/g, "").toUpperCase().slice(0, 12));
  const handleBankZip = (e) => setField("bankZip", e.target.value.replace(/[^\d-]/g, "").slice(0, 10));
  const handleSwift = (e) =>
    setField("swift", e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11));
  const handleAmount = (e) => setField("amount", cleanAmount(e.target.value));

  const handleCountry = (e) => {
    const next = COUNTRIES.find((c) => c.code === e.target.value);
    setForm((f) => ({
      ...f,
      country: e.target.value,
      account: formatAccount(f.account, type, next),
    }));
  };

  const changeType = (next) => {
    if (next === type) return;
    setType(next);
    setForm((f) => ({
      ...f,
      bank: "",
      routing: "",
      account: "",
      bankAddress: "",
      bankCity: "",
      bankState: "",
      bankZip: "",
      country: "",
      swift: "",
      purpose: "",
    }));
    setTouched({});
    setTried(false);
  };

  const goBack = () => {
    if (step === 0 || step === 3) navigate("/homeprofile");
    else {
      setStep((s) => s - 1);
      setTried(false);
      setSendError("");
    }
  };

  const next = () => {
    const bad = STEP_FIELDS[step].filter((f) => errors[f]);
    if (bad.length > 0) {
      setTried(true);
      setTimeout(() => document.getElementById(`sd-${bad[0]}`)?.focus(), 0);
      return;
    }
    setTried(false);
    setStep((s) => s + 1);
  };

  /* ----- the checks before the money moves: admin codes -> emailed code -> password ----- */
  const transferInfo = () => ({ amount: quote.amount, type, recipient: form.name.trim() });

  // where the transfer goes: the recipient's bank and the bank's address
  const recipientDetails = () => ({
    bank: form.bank.trim(),
    accountNumber: form.account,
    ...(type === "domestic"
      ? { routingNumber: form.routing }
      : { swift: form.swift, country: form.country }),
    bankAddress: {
      line1: form.bankAddress.trim(),
      city: form.bankCity.trim(),
      state: form.bankState,
      zip: form.bankZip,
    },
  });
  const transferSummary = `Sending ${formatMoney(quote.amount)} to ${form.name.trim()}`;

  // "Confirm and send": find out which codes the admin switched on for this customer
  const startConfirm = async () => {
    if (checkingCodes || sending) return;
    setSendError("");
    authProofRef.current = null;
    emailProofRef.current = null;
    setCheckingCodes(true);
    try {
      const { required } = await getTransferAuthorization();
      setCheckingCodes(false);
      if (required && required.length > 0) {
        setAuthRequired(required);
        setAuthOpen(true);
      } else {
        setCodeOpen(true);
      }
    } catch (error) {
      setCheckingCodes(false);
      setSendError(error.message);
    }
  };

  // every code the admin switched on was right: next the code we email
  const handleAuthVerified = (proof) => {
    authProofRef.current = proof;
    setAuthOpen(false);
    setCodeOpen(true);
  };

  // the emailed code was right: last, the password
  const handleCodeVerified = (res) => {
    emailProofRef.current = res && res.proof ? res.proof : null;
    setCodeOpen(false);
    setVerifyOpen(true);
  };

  const handleVerified = async () => {
    setVerifyOpen(false);
    setSendError("");
    if (!account) return;

    setSending(true);

    // the server checks the codes, the account and the balance, works out the fee, takes the money
    // and creates the reference, all in one step
    const result = await sendTransfer({
      ...transferInfo(),
      recipientDetails: recipientDetails(),
      emailProof: emailProofRef.current,
      authProof: authProofRef.current,
    });

    if (!result.ok) {
      setSending(false);
      // a code was switched on, or ran out, while the customer was confirming: start the checks again
      if (result.reason === "authorization_required" || result.reason === "code_required") {
        authProofRef.current = null;
        emailProofRef.current = null;
      }
      // a suspended account sees the suspended notice instead of an error
      if (result.reason !== "suspended") setSendError(result.error);
      return;
    }

    authProofRef.current = null;
    emailProofRef.current = null;

    setReceipt({
      reference: result.reference,
      name: form.name.trim(),
      type,
      sent: quote.amount,
      fee: result.fee,
      total: result.total,
      receive: quote.receive,
      currency: quote.currency,
      eta: type === "international" ? "1–3 business days" : "Within minutes",
    });
    setForm(initialForm);
    setTouched({});
    setSending(false);
    setStep(3);
  };

  const reset = () => {
    setType("domestic");
    setForm(initialForm);
    setTouched({});
    setTried(false);
    setSendError("");
    setReceipt(null);
    setStep(0);
  };

  const accountLabel = type === "international" && country?.iban ? "IBAN" : "Account number";

  return (
    <div className="sd-page">
      <div className="sd">
        <div className="sd-body">
          {/* ---------- Header ---------- */}
          <header className="sd-header">
            <button type="button" className="sd-round-btn" aria-label="Back" onClick={goBack}>
              <Icon name="back" />
            </button>
            <h1>{step === 3 ? "Money sent" : "Send Money"}</h1>
            <span aria-hidden="true" />
          </header>

          {/* ---------- Progress ---------- */}
          {step < 3 && (
            <ol className="sd-steps" aria-label="Progress">
              {STEPS.map((label, i) => (
                <li
                  key={label}
                  className={i < step ? "done" : i === step ? "current" : ""}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className="sd-step-dot">
                    {i < step ? <Icon name="check" className="sd-step-check" /> : i + 1}
                  </span>
                  <span className="sd-step-label">{label}</span>
                </li>
              ))}
            </ol>
          )}

          {/* ---------- Step 1: recipient ---------- */}
          {step === 0 && (
            <section aria-label="Recipient">
              <div className="sd-types" role="tablist" aria-label="Transfer type">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    role="tab"
                    key={t.id}
                    aria-selected={type === t.id}
                    className={type === t.id ? "active" : ""}
                    onClick={() => changeType(t.id)}
                  >
                    <Icon name={t.icon} />
                    <strong>{t.label}</strong>
                    <small>{t.hint}</small>
                  </button>
                ))}
              </div>

              <Field id="name" label="Recipient's full name" error={err("name")}>
                <div className="sd-input">
                  <Icon name="person" className="sd-field-icon" />
                  <input
                    id="sd-name"
                    type="text"
                    autoComplete="off"
                    placeholder="Name on the account"
                    value={form.name}
                    onChange={handleName}
                    onBlur={handleBlur("name")}
                    aria-invalid={Boolean(err("name"))}
                  />
                </div>
              </Field>

              {type === "international" && (
                <Field id="country" label="Destination country" error={err("country")}>
                  <div className="sd-input sd-select">
                    <Icon name="globe" className="sd-field-icon" />
                    <select
                      id="sd-country"
                      value={form.country}
                      onChange={handleCountry}
                      onBlur={handleBlur("country")}
                      aria-invalid={Boolean(err("country"))}
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              )}

              <Field id="bank" label="Recipient's bank" error={err("bank")}>
                <div className="sd-input">
                  <Icon name="bank" className="sd-field-icon" />
                  <input
                    id="sd-bank"
                    type="text"
                    autoComplete="off"
                    placeholder="Bank name"
                    value={form.bank}
                    onChange={handleBank}
                    onBlur={handleBlur("bank")}
                    aria-invalid={Boolean(err("bank"))}
                  />
                </div>
              </Field>

              {type === "domestic" && (
                <Field
                  id="routing"
                  label="Routing number"
                  error={err("routing")}
                  hint="9 digits. You can find it on a check or in the recipient's banking app."
                >
                  <div className="sd-input">
                    <Icon name="hash" className="sd-field-icon" />
                    <input
                      id="sd-routing"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000000000"
                      value={form.routing}
                      onChange={handleRouting}
                      onBlur={handleBlur("routing")}
                      aria-invalid={Boolean(err("routing"))}
                    />
                  </div>
                </Field>
              )}

              <Field
                id="account"
                label={accountLabel}
                error={err("account")}
                hint={type === "domestic" ? "10 digits" : undefined}
              >
                <div className="sd-input">
                  <Icon name="hash" className="sd-field-icon" />
                  <input
                    id="sd-account"
                    type="text"
                    inputMode={type === "domestic" ? "numeric" : "text"}
                    autoComplete="off"
                    placeholder={type === "domestic" ? "0000000000" : "Enter the number exactly as given"}
                    value={form.account}
                    onChange={handleAccount}
                    onBlur={handleBlur("account")}
                    aria-invalid={Boolean(err("account"))}
                  />
                </div>
              </Field>

              {type === "domestic" && (
                <>
                  <Field id="bankAddress" label="Bank address" error={err("bankAddress")}>
                    <div className="sd-input">
                      <Icon name="bank" className="sd-field-icon" />
                      <input
                        id="sd-bankAddress"
                        type="text"
                        autoComplete="off"
                        placeholder="Street address of the bank"
                        value={form.bankAddress}
                        onChange={handleBankAddress}
                        onBlur={handleBlur("bankAddress")}
                        aria-invalid={Boolean(err("bankAddress"))}
                      />
                    </div>
                  </Field>

                  <div className="sd-row">
                    <Field id="bankCity" label="City" error={err("bankCity")}>
                      <div className="sd-input">
                        <input
                          id="sd-bankCity"
                          type="text"
                          autoComplete="off"
                          placeholder="City"
                          value={form.bankCity}
                          onChange={handleBankCity}
                          onBlur={handleBlur("bankCity")}
                          aria-invalid={Boolean(err("bankCity"))}
                        />
                      </div>
                    </Field>

                    <Field id="bankState" label="State" error={err("bankState")}>
                      <div className="sd-input sd-select">
                        <select
                          id="sd-bankState"
                          value={form.bankState}
                          onChange={(e) => setField("bankState", e.target.value)}
                          onBlur={handleBlur("bankState")}
                          aria-invalid={Boolean(err("bankState"))}
                        >
                          <option value="">Select</option>
                          {US_STATES.map(([code, name]) => (
                            <option key={code} value={code}>
                              {code} · {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  </div>

                  <Field id="bankZip" label="ZIP code" error={err("bankZip")}>
                    <div className="sd-input">
                      <input
                        id="sd-bankZip"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="00000"
                        value={form.bankZip}
                        onChange={handleBankZip}
                        onBlur={handleBlur("bankZip")}
                        aria-invalid={Boolean(err("bankZip"))}
                      />
                    </div>
                  </Field>
                </>
              )}

              {type === "international" && (
                <Field
                  id="swift"
                  label="SWIFT / BIC code"
                  error={err("swift")}
                  hint="Identifies the recipient's bank. 8 or 11 characters."
                >
                  <div className="sd-input">
                    <Icon name="hash" className="sd-field-icon" />
                    <input
                      id="sd-swift"
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. DEUTDEFF"
                      value={form.swift}
                      onChange={handleSwift}
                      onBlur={handleBlur("swift")}
                      aria-invalid={Boolean(err("swift"))}
                    />
                  </div>
                </Field>
              )}

              {type === "international" && (
                <>
                  <Field id="bankAddress" label="Bank address" error={err("bankAddress")}>
                    <div className="sd-input">
                      <Icon name="bank" className="sd-field-icon" />
                      <input
                        id="sd-bankAddress"
                        type="text"
                        autoComplete="off"
                        placeholder="Street address of the bank"
                        value={form.bankAddress}
                        onChange={handleBankAddress}
                        onBlur={handleBlur("bankAddress")}
                        aria-invalid={Boolean(err("bankAddress"))}
                      />
                    </div>
                  </Field>


                  <div className="sd-row">
                    <Field id="bankCity" label="City" error={err("bankCity")}>
                      <div className="sd-input">
                        <input
                          id="sd-bankCity"
                          type="text"
                          autoComplete="off"
                          placeholder="City"
                          value={form.bankCity}
                          onChange={handleBankCity}
                          onBlur={handleBlur("bankCity")}
                          aria-invalid={Boolean(err("bankCity"))}
                        />
                      </div>
                    </Field>

                    <Field id="bankState" label="State / region" error={err("bankState")}>
                      <div className="sd-input">
                        <input
                          id="sd-bankState"
                          type="text"
                          autoComplete="off"
                          placeholder="Optional"
                          value={form.bankState}
                          onChange={handleBankRegion}
                        />
                      </div>
                    </Field>
                  </div>

                  <Field id="bankZip" label="Postal code" error={err("bankZip")}>
                    <div className="sd-input">
                      <input
                        id="sd-bankZip"
                        type="text"
                        autoComplete="off"
                        placeholder="Postal code"
                        value={form.bankZip}
                        onChange={handleBankPostal}
                        onBlur={handleBlur("bankZip")}
                        aria-invalid={Boolean(err("bankZip"))}
                      />
                    </div>
                  </Field>
                </>
              )}
            </section>
          )}

          {/* ---------- Step 2: amount ---------- */}
          {step === 1 && (
            <section aria-label="Amount">
              <p className="sd-sendingto">
                Sending to <strong>{form.name.trim()}</strong>
                <span>
                  {form.bank.trim()}
                  {type === "international" && country ? `, ${country.name}` : ""}
                </span>
              </p>

              <div className={`sd-amount ${err("amount") ? "has-error" : ""}`}>
                <label htmlFor="sd-amount">Amount to send (USD)</label>
                <div className="sd-amount-input">
                  <span aria-hidden="true">$</span>
                  <input
                    id="sd-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={handleAmount}
                    onBlur={handleBlur("amount")}
                    aria-invalid={Boolean(err("amount"))}
                  />
                </div>
                <p className="sd-avail">Available balance: {formatMoney(balance)}</p>
                {err("amount") && (
                  <p className="sd-error" role="alert">
                    {err("amount")}
                  </p>
                )}
              </div>

              {type === "international" && (
                <Field id="purpose" label="Reason for the transfer" error={err("purpose")}>
                  <div className="sd-input sd-select">
                    <Icon name="note" className="sd-field-icon" />
                    <select
                      id="sd-purpose"
                      value={form.purpose}
                      onChange={(e) => setField("purpose", e.target.value)}
                      onBlur={handleBlur("purpose")}
                      aria-invalid={Boolean(err("purpose"))}
                    >
                      <option value="">Select a reason</option>
                      {PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              )}

              <Field id="note" label="Note (optional)">
                <div className="sd-input">
                  <Icon name="note" className="sd-field-icon" />
                  <input
                    id="sd-note"
                    type="text"
                    autoComplete="off"
                    placeholder="Add a short message"
                    maxLength={80}
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                  />
                </div>
              </Field>

              {quote.amount > 0 && (
                <>
                  <QuoteList quote={quote} type={type} />
                  {type === "international" && (
                    <p className="sd-fineprint">
                      Rates are shown for guidance. The final rate is confirmed before you send.
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {/* ---------- Step 3: review ---------- */}
          {step === 2 && (
            <section aria-label="Review">
              <h2 className="sd-review-title">Check the details</h2>

              <dl className="sd-summary">
                <div>
                  <dt>To</dt>
                  <dd>{form.name.trim()}</dd>
                </div>
                <div>
                  <dt>Bank</dt>
                  <dd>{form.bank.trim()}</dd>
                </div>
                {type === "domestic" && (
                  <>
                    <div>
                      <dt>Routing number</dt>
                      <dd>{form.routing}</dd>
                    </div>
                    <div>
                      <dt>Bank address</dt>
                      <dd>
                        {form.bankAddress.trim()}, {form.bankCity.trim()}, {form.bankState} {form.bankZip}
                      </dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>{accountLabel}</dt>
                  <dd>{mask(form.account)}</dd>
                </div>
                {type === "international" && (
                  <>
                    <div>
                      <dt>Country</dt>
                      <dd>{country?.name}</dd>
                    </div>
                    <div>
                      <dt>SWIFT / BIC</dt>
                      <dd>{form.swift}</dd>
                    </div>
                    <div>
                      <dt>Bank address</dt>
                      <dd>
                        {[form.bankAddress.trim(), form.bankCity.trim(), [form.bankState.trim(), form.bankZip].filter(Boolean).join(" ")]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Reason</dt>
                      <dd>{form.purpose}</dd>
                    </div>
                  </>
                )}
                {form.note.trim() && (
                  <div>
                    <dt>Note</dt>
                    <dd>{form.note.trim()}</dd>
                  </div>
                )}
              </dl>

              <QuoteList quote={quote} type={type} />

              {sendError && (
                <p className="sd-error" role="alert">
                  {sendError}
                </p>
              )}

              <p className="sd-fineprint">
                Please check everything carefully. Transfers usually can't be reversed once they
                are sent.
              </p>
            </section>
          )}

          {/* ---------- Done ---------- */}
          {step === 3 && receipt && (
            <section className="sd-done" role="status">
              <span className="sd-done-icon">
                <Icon name="check" />
              </span>
              <h2>Transfer submitted</h2>
              <p>
                Your transfer to <strong>{receipt.name}</strong> is on its way.
              </p>

              <dl className="sd-summary">
                <div>
                  <dt>Reference</dt>
                  <dd className="mono">{receipt.reference}</dd>
                </div>
                <div>
                  <dt>Amount sent</dt>
                  <dd>{formatMoney(receipt.sent)}</dd>
                </div>
                <div>
                  <dt>Transfer fee</dt>
                  <dd>{formatMoney(receipt.fee)}</dd>
                </div>
                <div>
                  <dt>Total debited</dt>
                  <dd>{formatMoney(receipt.total)}</dd>
                </div>
                <div>
                  <dt>Recipient gets</dt>
                  <dd>{formatMoney(receipt.receive, receipt.currency)}</dd>
                </div>
                <div>
                  <dt>Estimated arrival</dt>
                  <dd>{receipt.eta}</dd>
                </div>
              </dl>

              <div className="sd-done-actions">
                <Link to="/homeprofile" className="sd-primary link">
                  Done
                </Link>
                <button type="button" className="sd-secondary" onClick={reset}>
                  Send another
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ---------- Footer button ---------- */}
        {step < 3 && (
          <footer className="sd-footer">
            <button
              type="button"
              className="sd-primary"
              disabled={sending || checkingCodes}
              onClick={step === 2 ? startConfirm : next}
            >
              {step === 2 ? (checkingCodes ? "Checking…" : "Confirm and send") : "Continue"}
            </button>
          </footer>
        )}
      </div>

      {/* ---------- 1. The codes the admin switched on (COT / TAC) ---------- */}
      <TransferCodesDialog
        open={authOpen}
        required={authRequired}
        transfer={transferInfo()}
        summary={transferSummary}
        onVerified={handleAuthVerified}
        onClose={() => setAuthOpen(false)}
      />

      {/* ---------- 2. The code we email ---------- */}
      <EmailCodeDialog
        open={codeOpen}
        title="Confirm this transfer"
        verifyLabel="Confirm"
        summary={transferSummary}
        send={() => sendTransferCode(transferInfo())}
        confirm={(code) => confirmTransferCode(code)}
        onVerified={handleCodeVerified}
        onClose={() => setCodeOpen(false)}
      />

      {/* ---------- 3. Password check before sending ---------- */}
      <VerifyDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={handleVerified}
        title="Confirm this transfer"
        description={`Enter your password to send ${formatMoney(quote.amount)} to ${form.name.trim()}. A ${formatMoney(quote.fee)} fee applies.`}
      />

      {sending && (
        <div className="sd-sending" role="status" aria-live="polite">
          <span className="sd-spinner" aria-hidden="true" />
          <p>Sending your money securely…</p>
        </div>
      )}
    </div>
  );
};

export default Send;