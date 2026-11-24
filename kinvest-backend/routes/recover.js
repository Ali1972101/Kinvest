const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const { HttpError } = require("../utils/errors");
const { signRecoveryToken, verifyToken } = require("../utils/tokens");
const { passwordProblem } = require("../utils/validate");
const { onlyDigits, isPlausibleTaxId, hashTaxId, taxIdMatches } = require("../utils/taxId");

const router = express.Router();

const MAX_FAILURES = 5; // wrong guesses allowed per account
const LOCK_MS = 30 * 60 * 1000; // then the account can't be recovered for 30 minutes

// one message for every kind of failure, so it never tells a stranger which part was wrong
const FAIL_MESSAGE =
  "We couldn't verify those details. Check them and try again. If you have tried several times, wait 30 minutes first.";
const SESSION_MESSAGE = "This recovery session has expired. Please start again.";

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const sameText = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* ---------- Step 1: check who it is ---------- */
// body: { account: "last 6 digits of card or account number", taxId: "SSN or ITIN" }
router.post("/verify", verifyLimiter, async (req, res) => {
  const body = req.body || {};
  const last6 = onlyDigits(body.account);
  const taxId = onlyDigits(body.taxId);

  if (!/^\d{6}$/.test(last6) || !isPlausibleTaxId(taxId)) throw new HttpError(400, FAIL_MESSAGE);

  // the last 6 digits can match more than one customer, so look at every match
  const found = await User.find({
    $or: [
      { accountNumber: { $regex: `${last6}$` } },
      { "card.number": { $regex: `${last6.slice(2)}$` } }, // card numbers are saved with spaces
    ],
  }).select("+taxIdHash +recoveryFailures +recoveryLockedUntil");

  const candidates = found.filter(
    (u) =>
      String(u.accountNumber).endsWith(last6) ||
      String((u.card && u.card.number) || "").replace(/\D/g, "").endsWith(last6)
  );

  const now = Date.now();
  let winner = null;
  const wrong = [];

  for (const u of candidates) {
    const locked = u.recoveryLockedUntil && u.recoveryLockedUntil.getTime() > now;
    const match = taxIdMatches(u.taxIdHash, u._id, taxId);
    if (locked) continue; // a locked account can't be unlocked by a correct guess
    if (match && !winner) winner = u;
    else if (!match) wrong.push(u);
  }

  // always do the same amount of work, whether or not anyone matched
  if (candidates.length === 0) hashTaxId("none", taxId);

  if (!winner) {
    for (const u of wrong) {
      const failures = (u.recoveryFailures || 0) + 1;
      const set =
        failures >= MAX_FAILURES
          ? { recoveryFailures: 0, recoveryLockedUntil: new Date(now + LOCK_MS) }
          : { recoveryFailures: failures };
      await User.updateOne({ _id: u._id }, { $set: set });
    }
    throw new HttpError(400, FAIL_MESSAGE);
  }

  // a fresh one-time code. Any earlier recovery pass stops working.
  const nonce = crypto.randomBytes(24).toString("hex");
  await User.updateOne(
    { _id: winner._id },
    { $set: { recoveryNonce: nonce, recoveryFailures: 0, recoveryLockedUntil: null } }
  );

  res.json({
    recoveryToken: signRecoveryToken(winner, nonce),
    userId: winner.userId,
    firstName: winner.firstName,
    expiresInMinutes: 15,
  });
});

/* ---------- Step 2: choose a new password ---------- */
// body: { recoveryToken, newPassword }
router.post("/reset", resetLimiter, async (req, res) => {
  const body = req.body || {};

  let payload;
  try {
    payload = verifyToken(typeof body.recoveryToken === "string" ? body.recoveryToken : "");
  } catch {
    throw new HttpError(401, SESSION_MESSAGE);
  }
  if (!payload || payload.role !== "recover" || !payload.jti) throw new HttpError(401, SESSION_MESSAGE);

  const problem = passwordProblem(body.newPassword);
  if (problem) throw new HttpError(400, problem);

  const passwordHash = await bcrypt.hash(body.newPassword, 12);

  // works only while the one-time code on the account still matches, and uses it up
  const result = await User.updateOne(
    { _id: payload.sub, recoveryNonce: String(payload.jti) },
    { $set: { passwordHash, recoveryFailures: 0, recoveryLockedUntil: null }, $unset: { recoveryNonce: 1 } }
  );
  if (result.modifiedCount !== 1) throw new HttpError(401, SESSION_MESSAGE);

  res.json({ ok: true });
});

module.exports = router;