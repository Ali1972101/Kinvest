const express = require("express");
const rateLimit = require("express-rate-limit");

const OtpCode = require("../models/OtpCode");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../utils/errors");
const { parseAmount, envNumber } = require("../utils/money");
const { str } = require("../utils/validate");
const { sendTransferCodeEmail } = require("../utils/mailer");
const {
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
} = require("../utils/otp");

const router = express.Router();
router.use(requireAuth);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const SUPPORT_EMAIL = "support@kinqora.com";

/* ---------- Send a code to the email the customer signed up with ---------- */
// body: { amount, type: "domestic" | "international", recipient }
router.post("/transfer/send", limiter, async (req, res) => {
  const user = req.user;
  if (user.status === "suspended")
    throw new HttpError(403, `Your account has been suspended. Please contact us at ${SUPPORT_EMAIL}.`, "suspended");

  const body = req.body || {};
  const type = body.type;
  if (!["domestic", "international"].includes(type))
    throw new HttpError(400, "Choose a domestic or international transfer.");
  const recipient = str(body.recipient).slice(0, 80);
  if (!recipient) throw new HttpError(400, "Enter the recipient's name.");
  const amountCents = parseAmount(body.amount, {
    min: 0.01,
    max: envNumber("MAX_TRANSFER_USD", 100000000),
    label: "transfer amount",
  });

  const now = new Date();
  const existing = await OtpCode.findOne({ userId: user._id, purpose: "transfer" });
  const sameTransfer =
    existing && existing.amountCents === amountCents && existing.type === type && existing.recipient === recipient;

  // asked again very soon: reuse the code that is already on its way instead of sending another
  if (existing && existing.lastSentAt) {
    const waited = (now - existing.lastSentAt) / 1000;
    if (waited < RESEND_SECONDS) {
      const wait = Math.ceil(RESEND_SECONDS - waited);
      const stillValid = existing.codeHash && existing.expiresAt > now && existing.attempts < MAX_ATTEMPTS;
      if (sameTransfer && stillValid) {
        return res.json({
          sentTo: maskEmail(user.email),
          expiresInMinutes: CODE_MINUTES,
          resendAfterSeconds: wait,
          alreadySent: true,
        });
      }
      // a different code is still waiting: slow things down. If the last code was already used, send a new one.
      if (existing.codeHash) throw new HttpError(429, `Please wait ${wait} seconds before asking for another code.`, "wait");
    }
  }

  // no more than a few emails an hour
  const inWindow = existing && existing.windowStart && now - existing.windowStart < 60 * 60 * 1000;
  if (inWindow && existing.sendCount >= MAX_SENDS_PER_HOUR)
    throw new HttpError(429, "You've asked for too many codes. Please try again in about an hour.", "too_many");

  const code = newCode();
  const doc = await OtpCode.findOneAndUpdate(
    { userId: user._id, purpose: "transfer" },
    {
      $set: {
        codeHash: hashCode(user._id, code),
        expiresAt: new Date(now.getTime() + CODE_MINUTES * 60 * 1000),
        attempts: 0,
        amountCents,
        type,
        recipient,
        lastSentAt: now,
        sendCount: inWindow ? existing.sendCount + 1 : 1,
        windowStart: inWindow ? existing.windowStart : now,
        proofHash: null,
        proofExpiresAt: null,
        usedAt: null,
        expireAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  try {
    await sendTransferCodeEmail({
      to: user.email,
      firstName: user.firstName,
      code,
      amountCents,
      type,
      recipient,
      minutes: CODE_MINUTES,
    });
  } catch (err) {
    if (!err.mailFailed) console.error("Could not send the transfer code:", err);
    // nothing was delivered, so the code can't be used and doesn't count against the limits
    await OtpCode.updateOne({ _id: doc._id }, { $set: { codeHash: null, lastSentAt: null }, $inc: { sendCount: -1 } });
    throw new HttpError(502, "We couldn't send the email right now. Please try again in a moment.", "email_failed");
  }

  res.json({ sentTo: maskEmail(user.email), expiresInMinutes: CODE_MINUTES, resendAfterSeconds: RESEND_SECONDS });
});

/* ---------- Check the code the customer typed ---------- */
// body: { code }  ->  { proof }  (the transfer route needs this proof)
router.post("/transfer/verify", limiter, async (req, res) => {
  const user = req.user;
  const code = str(req.body && req.body.code).replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from your email.");

  const now = new Date();
  const doc = await OtpCode.findOne({ userId: user._id, purpose: "transfer" });

  if (!doc || !doc.codeHash || !doc.expiresAt || doc.expiresAt <= now)
    throw new HttpError(400, "That code has expired. Request a new one.", "expired");

  if (doc.attempts >= MAX_ATTEMPTS)
    throw new HttpError(429, "Too many wrong codes. Request a new code.", "locked");

  if (!sameHash(doc.codeHash, hashCode(user._id, code))) {
    const updated = await OtpCode.findOneAndUpdate(
      { _id: doc._id, codeHash: doc.codeHash },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" }
    );
    const left = Math.max(MAX_ATTEMPTS - (updated ? updated.attempts : MAX_ATTEMPTS), 0);
    if (left === 0) throw new HttpError(429, "Too many wrong codes. Request a new code.", "locked");
    throw new HttpError(400, `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`, "wrong_code");
  }

  // right code: it can't be used again, and the customer gets a one-time proof for this transfer
  const proof = newProof();
  const ok = await OtpCode.findOneAndUpdate(
    { _id: doc._id, codeHash: doc.codeHash, attempts: { $lt: MAX_ATTEMPTS } },
    {
      $set: {
        codeHash: null,
        proofHash: hashProof(user._id, proof),
        proofExpiresAt: new Date(now.getTime() + PROOF_MINUTES * 60 * 1000),
        usedAt: null,
      },
    },
    { returnDocument: "after" }
  );
  if (!ok) throw new HttpError(400, "That code has expired. Request a new one.", "expired");

  res.json({ proof, validForMinutes: PROOF_MINUTES });
});

module.exports = router;