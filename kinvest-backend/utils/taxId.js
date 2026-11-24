const crypto = require("crypto");
const { HttpError } = require("./errors");

/*
  SSNs and ITINs are never stored as they are typed. We keep only a keyed hash (HMAC-SHA256):
  - the key ("pepper") lives in the server settings, not in the database, so a stolen database
    alone cannot be used to work the numbers out;
  - each person's hash also mixes in their own account id, so equal numbers give different hashes.
  Set TAXID_PEPPER to a long random string. Keep it safe, and do not change it later, or every
  saved number stops matching.
*/
const pepper = () => {
  const p = process.env.TAXID_PEPPER || process.env.JWT_SECRET;
  if (!p || p.length < 32) throw new Error("Set TAXID_PEPPER to a random string of at least 32 characters.");
  return p;
};

const onlyDigits = (v) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/\D/g, "") : "");

// the basic shape of a valid SSN or ITIN. The server can't check it is real, only that it is plausible.
const isPlausibleTaxId = (d) =>
  /^\d{9}$/.test(d) && d.slice(0, 3) !== "000" && d.slice(3, 5) !== "00" && d.slice(5) !== "0000";

const cleanTaxId = (value) => {
  const d = onlyDigits(value);
  if (!isPlausibleTaxId(d)) throw new HttpError(400, "Enter a valid 9-digit SSN or ITIN.");
  return d;
};

const hashTaxId = (userId, digits) =>
  crypto.createHmac("sha256", pepper()).update(`taxid:${String(userId)}:${digits}`).digest("hex");

// compares in constant time. Always does the same work, even when nothing is saved.
const taxIdMatches = (storedHex, userId, digits) => {
  const expected = Buffer.from(hashTaxId(userId, digits), "hex");
  const stored = Buffer.from(typeof storedHex === "string" ? storedHex : "", "hex");
  if (stored.length !== expected.length) return false;
  return crypto.timingSafeEqual(stored, expected);
};

module.exports = { onlyDigits, isPlausibleTaxId, cleanTaxId, hashTaxId, taxIdMatches };
