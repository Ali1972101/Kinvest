/* ---------------------------------------------------------------------------
   SAMPLE DATA. Replace the rates, fees, limits, balance and account details with
   real values from your server. Never trust exchange rates or fees from the browser:
   your server must quote them and apply them again when the transfer is made.
--------------------------------------------------------------------------- */
export const AVAILABLE_BALANCE = 8545;
export const DOMESTIC_FEE = 2;
export const INTERNATIONAL_FEE = 12;
export const MIN_DOMESTIC = 1;
export const MIN_INTERNATIONAL = 10;

// the customer's own details, shown on the Receive page
export const ACCOUNT = {
  holder: "Ali",
  accountNumber: "0000000000",
  accountType: "Checking account",
  bank: "KinvestBank",
  iban: "XX00 KINV 0000 0000 0000 00",
  swift: "KINVXX00",
  bankAddress: "123 Main Street, Your City",
  currencies: "USD, EUR, GBP",
};

// how many units of each currency you get for 1 US dollar (sample rates only)
const RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1500, GHS: 15, KES: 129, ZAR: 18.5,
  CAD: 1.36, AUD: 1.52, JPY: 150, CNY: 7.2, INR: 83, AED: 3.67, CHF: 0.88,
  SGD: 1.34, BRL: 5.0, MXN: 17, SAR: 3.75, TRY: 32, EGP: 48, PHP: 56,
  KRW: 1330, DKK: 6.9, NOK: 10.7, SEK: 10.5, PLN: 4.0, QAR: 3.64, ILS: 3.7,
};

// iban: true means accounts in that country are written as an IBAN
export const COUNTRIES = [
  { code: "AU", name: "Australia", currency: "AUD", iban: false },
  { code: "AT", name: "Austria", currency: "EUR", iban: true },
  { code: "BE", name: "Belgium", currency: "EUR", iban: true },
  { code: "BR", name: "Brazil", currency: "BRL", iban: true },
  { code: "CA", name: "Canada", currency: "CAD", iban: false },
  { code: "CN", name: "China", currency: "CNY", iban: false },
  { code: "DK", name: "Denmark", currency: "DKK", iban: true },
  { code: "EG", name: "Egypt", currency: "EGP", iban: true },
  { code: "FI", name: "Finland", currency: "EUR", iban: true },
  { code: "FR", name: "France", currency: "EUR", iban: true },
  { code: "DE", name: "Germany", currency: "EUR", iban: true },
  { code: "GH", name: "Ghana", currency: "GHS", iban: false },
  { code: "IN", name: "India", currency: "INR", iban: false },
  { code: "IE", name: "Ireland", currency: "EUR", iban: true },
  { code: "IL", name: "Israel", currency: "ILS", iban: true },
  { code: "IT", name: "Italy", currency: "EUR", iban: true },
  { code: "JP", name: "Japan", currency: "JPY", iban: false },
  { code: "KE", name: "Kenya", currency: "KES", iban: false },
  { code: "MX", name: "Mexico", currency: "MXN", iban: false },
  { code: "NL", name: "Netherlands", currency: "EUR", iban: true },
  { code: "NG", name: "Nigeria", currency: "NGN", iban: false },
  { code: "NO", name: "Norway", currency: "NOK", iban: true },
  { code: "PH", name: "Philippines", currency: "PHP", iban: false },
  { code: "PL", name: "Poland", currency: "PLN", iban: true },
  { code: "PT", name: "Portugal", currency: "EUR", iban: true },
  { code: "QA", name: "Qatar", currency: "QAR", iban: true },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", iban: true },
  { code: "SG", name: "Singapore", currency: "SGD", iban: false },
  { code: "ZA", name: "South Africa", currency: "ZAR", iban: false },
  { code: "KR", name: "South Korea", currency: "KRW", iban: false },
  { code: "ES", name: "Spain", currency: "EUR", iban: true },
  { code: "SE", name: "Sweden", currency: "SEK", iban: true },
  { code: "CH", name: "Switzerland", currency: "CHF", iban: true },
  { code: "TR", name: "Türkiye", currency: "TRY", iban: true },
  { code: "AE", name: "United Arab Emirates", currency: "AED", iban: true },
  { code: "GB", name: "United Kingdom", currency: "GBP", iban: true },
  { code: "US", name: "United States", currency: "USD", iban: false },
];

export const PURPOSES = [
  "Family support",
  "Education",
  "Travel",
  "Gift",
  "Payment for goods or services",
  "Business payment",
  "Savings or investment",
  "Other",
];

/* ---------- Money ---------- */
const round2 = (n) => Math.round(n * 100) / 100;

export const getQuote = (amount, type, currency) => {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const international = type === "international";
  const fee = safe > 0 ? (international ? INTERNATIONAL_FEE : DOMESTIC_FEE) : 0;
  const rate = international ? RATES[currency] ?? 1 : 1;

  return {
    amount: safe,
    fee,
    total: round2(safe + fee),
    rate,
    receive: round2(safe * rate),
    currency: international ? currency : "USD",
  };
};

export const formatMoney = (value, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
};

export const formatRate = (rate, currency) =>
  `1 USD = ${rate.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currency}`;

/* ---------- Checks ---------- */
export const isValidSwift = (value) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value);

// the standard IBAN checksum (mod 97)
export const isValidIban = (raw) => {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= "A" ? ch.charCodeAt(0) - 55 : Number(ch);
    remainder = Number(`${remainder}${value}`) % 97;
  }
  return remainder === 1;
};