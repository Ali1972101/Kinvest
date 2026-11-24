import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import "./TopUp.css";
import VerifyDialog from "../Components/VerifyDialog";
import { ACCOUNT, formatMoney } from "../Components/transferData";
import { creditUser, fullName, useCurrentUser } from "../Components/userStore";

/* ---------------------------------------------------------------------------
   SAMPLE SETTINGS. Replace with your real fees and limits. Your server must apply
   them again, and the card must be charged through your payment provider.
--------------------------------------------------------------------------- */
const CARD_FEE_RATE = 0.015; // 1.5% on card top-ups
const MIN_TOPUP = 5;
const MAX_TOPUP = 100000000; // $100 million
const QUICK_AMOUNTS = [50, 100, 200, 500];

/* ---------- Icons ---------- */
const paths = {
  back: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
};

const Icon = ({ name, className = "" }) => (
  <svg className={`tu-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
    {paths[name]}
  </svg>
);

/* ---------- Helpers ---------- */
const round2 = (n) => Math.round(n * 100) / 100;

const cleanAmount = (raw) => {
  let v = raw.replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return v.replace(/^0+(?=\d)/, "").slice(0, 12);
};

// works out the fee, the total charged and the new balance from the real balance
const quoteFor = (amount, balance) => {
  const a = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const fee = round2(a * CARD_FEE_RATE);
  return { amount: a, fee, total: round2(a + fee), newBalance: round2(balance + a) };
};

const amountProblem = (raw) => {
  const n = Number(raw);
  if (!raw || !(n > 0)) return "Enter an amount";
  if (n < MIN_TOPUP) return `The minimum top up is ${formatMoney(MIN_TOPUP)}`;
  if (n > MAX_TOPUP) return `The maximum for one top up is ${formatMoney(MAX_TOPUP)}`;
  return "";
};

const makeReference = () =>
  `TU${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const FEE_LABEL = `${Math.round(CARD_FEE_RATE * 1000) / 10}%`;

/* ---------- Page ---------- */
const TopUp = () => {
  const navigate = useNavigate();
  const account = useCurrentUser();

  const [method, setMethod] = useState("card");
  const [step, setStep] = useState(0);
  const [raw, setRaw] = useState("");
  const [touched, setTouched] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState("");
  const [payError, setPayError] = useState("");
  const timerRef = useRef(null);
  const copyTimer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearTimeout(copyTimer.current);
    },
    []
  );

  const balance = account ? account.balance : 0;
  const quote = useMemo(() => quoteFor(Number(raw), balance), [raw, balance]);
  const problem = amountProblem(raw);
  const showError = touched && problem;

  // keep this page for logged-in users only
  if (sessionStorage.getItem("kinvest_auth") !== "true" || !account) {
    return <Navigate to="/" replace />;
  }

  // the customer's own details
  const bankReference = `TOPUP-${account.accountNumber.slice(-4)}`;
  const bankRows = [
    { key: "name", label: "Account name", value: fullName(account) },
    { key: "number", label: "Account number", value: account.accountNumber, mono: true },
    { key: "bank", label: "Bank", value: ACCOUNT.bank },
    { key: "ref", label: "Payment reference", value: bankReference, mono: true },
  ];
  const savedCard = {
    brand: account.card.brand,
    last4: account.card.number.replace(/\s/g, "").slice(-4),
  };

  const goBack = () => {
    if (step === 1) setStep(0);
    else navigate("/homeprofile");
  };

  const next = () => {
    if (problem) {
      setTouched(true);
      document.getElementById("tu-amount")?.focus();
      return;
    }
    setPayError("");
    setStep(1);
  };

  const handleVerified = async () => {
    setVerifyOpen(false);
    setSending(true);

    // Charge the card through your payment provider here (with 3-D Secure if required).
    // Your SERVER must confirm the payment before it adds the money to the account.
    await new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 1500);
    });

    const reference = makeReference();

    // adds the money to this customer's balance and records the transaction
    const result = creditUser(account.id, quote.amount, {
      name: "Top up from card",
      category: `${savedCard.brand} •••• ${savedCard.last4}`,
      reference,
    });

    setSending(false);

    if (!result.ok) {
      setPayError("We couldn't add the money. Please try again.");
      return;
    }

    setReceipt({
      reference,
      added: quote.amount,
      charged: quote.total,
      balance: quote.newBalance,
    });
    setRaw("");
    setTouched(false);
    setStep(2);
  };

  const copy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(""), 2000);
    } catch {
      /* clipboard blocked by the browser, ignore */
    }
  };

  const onBank = method === "bank";

  return (
    <div className="tu-page">
      <div className="tu">
        <div className="tu-body">
          {/* ---------- Header ---------- */}
          <header className="tu-header">
            <button type="button" className="tu-round-btn" aria-label="Back" onClick={goBack}>
              <Icon name="back" />
            </button>
            <h1>{step === 2 ? "Top up complete" : "Top Up"}</h1>
            <span aria-hidden="true" />
          </header>

          {/* ---------- Step 1: choose a method ---------- */}
          {step === 0 && (
            <>
              <div className="tu-tabs" role="tablist" aria-label="Top up method">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!onBank}
                  className={!onBank ? "active" : ""}
                  onClick={() => setMethod("card")}
                >
                  Debit card
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={onBank}
                  className={onBank ? "active" : ""}
                  onClick={() => setMethod("bank")}
                >
                  Bank transfer
                </button>
              </div>

              {!onBank ? (
                <section aria-label="Top up with a card">
                  <p className="tu-balance">
                    Current balance <strong>{formatMoney(balance)}</strong>
                  </p>

                  <div className={`tu-amount ${showError ? "has-error" : ""}`}>
                    <label htmlFor="tu-amount">Amount to add (USD)</label>
                    <div className="tu-amount-input">
                      <span aria-hidden="true">$</span>
                      <input
                        id="tu-amount"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0.00"
                        value={raw}
                        onChange={(e) => setRaw(cleanAmount(e.target.value))}
                        onBlur={() => setTouched(true)}
                        aria-invalid={Boolean(showError)}
                      />
                    </div>
                    {showError && (
                      <p className="tu-error" role="alert">
                        {problem}
                      </p>
                    )}
                  </div>

                  <div className="tu-chips" aria-label="Quick amounts">
                    {QUICK_AMOUNTS.map((a) => (
                      <button
                        type="button"
                        key={a}
                        className={Number(raw) === a ? "active" : ""}
                        onClick={() => {
                          setRaw(String(a));
                          setTouched(false);
                        }}
                      >
                        ${a}
                      </button>
                    ))}
                  </div>

                  <div className="tu-card-row">
                    <span className="tu-mc" aria-hidden="true">
                      <i className="red" />
                      <i className="orange" />
                    </span>
                    <div>
                      <strong>
                        {savedCard.brand} •••• {savedCard.last4}
                      </strong>
                      <small>Your card</small>
                    </div>
                    <Link to="/my-cards">View</Link>
                  </div>

                  {quote.amount > 0 && !problem && (
                    <dl className="tu-quote">
                      <div>
                        <dt>Amount added</dt>
                        <dd>{formatMoney(quote.amount)}</dd>
                      </div>
                      <div>
                        <dt>Card fee ({FEE_LABEL})</dt>
                        <dd>{formatMoney(quote.fee)}</dd>
                      </div>
                      <div className="total">
                        <dt>Total charged to your card</dt>
                        <dd>{formatMoney(quote.total)}</dd>
                      </div>
                      <div className="receive">
                        <dt>New balance</dt>
                        <dd>{formatMoney(quote.newBalance)}</dd>
                      </div>
                    </dl>
                  )}

                  <p className="tu-fineprint">
                    Limits: {formatMoney(MIN_TOPUP)} to {formatMoney(MAX_TOPUP)} per top up. Card
                    top ups are usually instant.
                  </p>
                </section>
              ) : (
                <section aria-label="Top up by bank transfer">
                  <p className="tu-intro">
                    Send money from your other bank to the account below. Always include the
                    payment reference so we can match it to you.
                  </p>

                  <dl className="tu-bank">
                    {bankRows.map((r) => (
                      <div className="tu-bank-row" key={r.key}>
                        <div>
                          <dt>{r.label}</dt>
                          <dd className={r.mono ? "mono" : ""}>{r.value}</dd>
                        </div>
                        <button
                          type="button"
                          className={copied === r.key ? "copied" : ""}
                          onClick={() => copy(r.key, r.value)}
                          aria-label={`Copy ${r.label}`}
                        >
                          {copied === r.key ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ))}
                  </dl>

                  <p className="tu-fineprint">
                    Bank transfers are free. Your balance updates as soon as we receive the money,
                    usually within 1 business day.
                  </p>
                </section>
              )}
            </>
          )}

          {/* ---------- Step 2: review ---------- */}
          {step === 1 && (
            <section aria-label="Review">
              <h2 className="tu-review-title">Check the details</h2>

              <dl className="tu-summary">
                <div>
                  <dt>Pay with</dt>
                  <dd>
                    {savedCard.brand} •••• {savedCard.last4}
                  </dd>
                </div>
                <div>
                  <dt>Amount added</dt>
                  <dd>{formatMoney(quote.amount)}</dd>
                </div>
                <div>
                  <dt>Card fee ({FEE_LABEL})</dt>
                  <dd>{formatMoney(quote.fee)}</dd>
                </div>
                <div>
                  <dt>Total charged</dt>
                  <dd>
                    <strong>{formatMoney(quote.total)}</strong>
                  </dd>
                </div>
                <div>
                  <dt>New balance</dt>
                  <dd>{formatMoney(quote.newBalance)}</dd>
                </div>
              </dl>

              {payError && (
                <p className="tu-error" role="alert">
                  {payError}
                </p>
              )}

              <p className="tu-secure">
                <Icon name="lock" />
                Your card is charged securely. We never see or store your full card number.
              </p>
            </section>
          )}

          {/* ---------- Done ---------- */}
          {step === 2 && receipt && (
            <section className="tu-done" role="status">
              <span className="tu-done-icon">
                <Icon name="check" />
              </span>
              <h2>Money added</h2>
              <p>
                <strong>{formatMoney(receipt.added)}</strong> has been added to your account.
              </p>

              <dl className="tu-summary">
                <div>
                  <dt>Reference</dt>
                  <dd className="mono">{receipt.reference}</dd>
                </div>
                <div>
                  <dt>Charged to card</dt>
                  <dd>{formatMoney(receipt.charged)}</dd>
                </div>
                <div>
                  <dt>New balance</dt>
                  <dd>{formatMoney(receipt.balance)}</dd>
                </div>
              </dl>

              <Link to="/homeprofile" className="tu-primary link">
                Done
              </Link>
            </section>
          )}
        </div>

        {/* ---------- Footer button ---------- */}
        {step === 0 && (
          <footer className="tu-footer">
            {onBank ? (
              <Link to="/homeprofile" className="tu-primary">
                Done
              </Link>
            ) : (
              <button type="button" className="tu-primary" onClick={next}>
                Continue
              </button>
            )}
          </footer>
        )}

        {step === 1 && (
          <footer className="tu-footer">
            <button
              type="button"
              className="tu-primary"
              disabled={sending}
              onClick={() => setVerifyOpen(true)}
            >
              Confirm top up
            </button>
          </footer>
        )}
      </div>

      {/* ---------- Password check before charging ---------- */}
      <VerifyDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={handleVerified}
        title="Confirm this top up"
        description={`Enter your password to add ${formatMoney(quote.amount)} to your account. ${formatMoney(quote.total)} will be charged to your card.`}
      />

      {sending && (
        <div className="tu-sending" role="status" aria-live="polite">
          <span className="tu-spinner" aria-hidden="true" />
          <p>Processing your payment…</p>
        </div>
      )}
    </div>
  );
};

export default TopUp;