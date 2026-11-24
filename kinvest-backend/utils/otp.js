const crypto = require("crypto");
const OtpCode = require("../models/OtpCode");

const CODE_MINUTES = 10; // how long an emailed code works
const PROOF_MINUTES = 5; // how long after entering it the customer has to confirm the transfer
const MAX_ATTEMPTS = 5; // wrong guesses per code
const RESEND_SECONDS = 45; // wait between emails
const MAX_SENDS_PER_HOUR = 6;

const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET;

const hmac = (label, userId, value) =>
  crypto.createHmac("sha256", secret()).update(`${label}:${String(userId)}:${value}`).digest("hex");

const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
const newProof = () => crypto.randomBytes(24).toString("hex");

const hashCode = (userId, code) => hmac("otp-code", userId, code);
const hashProof = (userId, proof) => hmac("otp-proof", userId, proof);

const sameHash = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
};

// "jane.doe@gmail.com" -> "j•••@gmail.com"
const maskEmail = (email) => {
  const [name = "", domain = ""] = String(email).split("@");
  return `${name.slice(0, 1)}•••@${domain}`;
};

/*
  The transfer route calls this right before taking the money. It works only if the customer
  entered an emailed code for THIS amount, type and recipient, within the time limit, and only once.
*/
const consumeTransferProof = async (userId, proof, { amountCents, type, recipient }) => {
  if (typeof proof !== "string" || proof.length < 16 || proof.length > 200) return null;
  const proofHash = hashProof(userId, proof);
  const doc = await OtpCode.findOneAndUpdate(
    {
      userId,
      purpose: "transfer",
      proofHash,
      usedAt: null,
      proofExpiresAt: { $gt: new Date() },
      amountCents,
      type,
      recipient,
    },
    { $set: { usedAt: new Date(), proofHash: null } },
    { returnDocument: "before" }
  );
  return doc ? { id: doc._id, proofHash } : null;
};

// the transfer did not go through (for example, not enough balance), so the customer may try again
const restoreTransferProof = (consumed) =>
  consumed
    ? OtpCode.updateOne({ _id: consumed.id }, { $set: { usedAt: null, proofHash: consumed.proofHash } })
    : null;

module.exports = {
  CODE_MINUTES,
  PROOF_MINUTES,
  MAX_ATTEMPTS,
  RESEND_SECONDS,
  MAX_SENDS_PER_HOUR,
  newCode,
  newProof,
  hashCode,
  hashProof,
  sameHash,
  maskEmail,
  consumeTransferProof,
  restoreTransferProof,
};