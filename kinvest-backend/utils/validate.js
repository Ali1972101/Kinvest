const { HttpError } = require("./errors");

const str = (v) => (typeof v === "string" ? v.trim() : "");

const ACCOUNT_TYPES = [
  "Checking & Savings",
  "Credit Card",
  "Home Loan",
  "Auto Loan",
  "Small Business",
  "Investing",
];

const passwordProblem = (p) => {
  if (typeof p !== "string" || p.length < 8) return "Your password must be at least 8 characters.";
  if (p.length > 128) return "Your password is too long.";
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p)) return "Your password needs upper and lower case letters.";
  if (!/\d/.test(p)) return "Your password needs at least one number.";
  if (!/[^A-Za-z0-9]/.test(p)) return "Your password needs at least one symbol.";
  return "";
};

const cleanName = (value, label) => {
  const v = str(value);
  if (!v || v.length > 60) throw new HttpError(400, `Enter your ${label}.`);
  return v;
};

const cleanEmail = (value) => {
  const v = str(value).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(v) || v.length > 254) throw new HttpError(400, "Enter a valid email address.");
  return v;
};

const cleanPhone = (value) => {
  const v = str(value);
  if (v.replace(/\D/g, "").length < 7 || v.length > 30)
    throw new HttpError(400, "Enter a valid phone number.");
  return v;
};

const cleanAddress = (a) => {
  if (!a || typeof a !== "object") throw new HttpError(400, "Enter your address.");

  const out = {
    line1: str(a.line1),
    line2: str(a.line2),
    city: str(a.city),
    state: str(a.state),
    postalCode: str(a.postalCode),
    country: str(a.country),
  };

  if (out.line1.length < 5) throw new HttpError(400, "Enter your street address.");
  if (!out.city) throw new HttpError(400, "Enter your city.");
  if (!out.state) throw new HttpError(400, "Enter your state or region.");
  if (!/^[A-Za-z0-9 -]{3,10}$/.test(out.postalCode)) throw new HttpError(400, "Enter a valid postal code.");
  if (!out.country) throw new HttpError(400, "Enter your country.");
  for (const value of Object.values(out))
    if (value.length > 120) throw new HttpError(400, "One of the address lines is too long.");

  return out;
};

const cleanUserId = (value) => {
  const v = str(value);
  if (!/^[A-Za-z0-9_.-]{6,20}$/.test(v)) throw new HttpError(400, "Your User ID must be 6 to 20 letters, numbers, . _ or -");
  return v;
};

module.exports = {
  ACCOUNT_TYPES,
  str,
  passwordProblem,
  cleanName,
  cleanEmail,
  cleanPhone,
  cleanAddress,
  cleanUserId,
};
