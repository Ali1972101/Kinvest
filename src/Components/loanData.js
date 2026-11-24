/* ---------------------------------------------------------------------------
   SAMPLE DATA. Replace the rates, limits and fees with your real products.
   Your SERVER must calculate the offer and make the lending decision. Never trust
   a rate, fee or approval that comes from the browser.
--------------------------------------------------------------------------- */
export const LOAN_TYPES = [
  { id: "personal", label: "Personal", hint: "For everyday needs", rate: 18, min: 500, max: 25000, minTerm: 6, maxTerm: 60, defaultAmount: 5000, defaultTerm: 24 },
  { id: "business", label: "Business", hint: "Grow your business", rate: 16, min: 1000, max: 100000, minTerm: 6, maxTerm: 84, defaultAmount: 10000, defaultTerm: 36 },
  { id: "education", label: "Education", hint: "Tuition and study costs", rate: 12, min: 500, max: 30000, minTerm: 6, maxTerm: 72, defaultAmount: 3000, defaultTerm: 24 },
  { id: "auto", label: "Auto", hint: "Buy a vehicle", rate: 14, min: 2000, max: 60000, minTerm: 12, maxTerm: 72, defaultAmount: 15000, defaultTerm: 48 },
];

export const AMOUNT_STEP = 100;
export const PROCESSING_FEE_RATE = 0.01; // 1% of the loan, deducted when the money is paid out
export const MAX_PAYMENT_SHARE = 0.4; // a monthly payment above 40% of income is flagged

export const PURPOSES = [
  "Home improvement",
  "Debt consolidation",
  "Education",
  "Medical expenses",
  "Travel",
  "Business expense",
  "Vehicle",
  "Other",
];

export const EMPLOYMENT = [
  "Employed full-time",
  "Employed part-time",
  "Self-employed",
  "Business owner",
  "Student",
  "Retired",
  "Unemployed",
];

const round2 = (n) => Math.round(n * 100) / 100;

// the standard monthly repayment formula
export const calcLoan = (principal, ratePercent, months) => {
  const p = Number(principal) || 0;
  const n = Math.max(1, Number(months) || 1);
  const r = ratePercent / 100 / 12;

  const monthly = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
  const total = monthly * n;

  return {
    principal: p,
    monthly: round2(monthly),
    total: round2(total),
    interest: round2(total - p),
    fee: round2(p * PROCESSING_FEE_RATE),
  };
};

export const formatTerm = (months) => {
  if (months < 12) return `${months} months`;
  const y = Math.floor(months / 12);
  const r = months % 12;
  const years = `${y} ${y === 1 ? "year" : "years"}`;
  return r ? `${months} months (${years} ${r} mo)` : `${months} months (${years})`;
};