const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const { HttpError } = require("../utils/errors");
const { signUserToken } = require("../utils/tokens");
const { hashTaxId } = require("../utils/taxId");
const { sendSignupCodeEmail } = require("../utils/mailer");
const { cleanEmail } = require("../utils/validate");
const { parseSignup, assertAvailable, createAccount, newObjectId } = require("../utils/signup");
const {
  CODE_MINUTES,
  MAX_ATTEMPTS,
  RESEND_SECONDS,
  MAX_SENDS_PER_HOUR,
  newCode,
  hashCode,
  sameHash,
  maskEmail,
} = require("../utils/otp");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const DAY_MS = 60 * 60 * 1000;
const keyFor = (email) => `signup:${email}`; // keeps sign-up codes apart from transfer codes

/*
  Makes a new code, saves its hash on the pending sign-up, and emails it.
  "patch" can replace the saved details (when the customer starts or restarts the form).
*/
const issueCode = async (email, existing, patch) => {
  const now = new Date();

  // asked again too soon
  if (existing && existing.lastSentAt) {
    const waited = (now - existing.lastSentAt) / 1000;
    if (waited < RESEND_SECONDS)
      throw new HttpError(429, `Please wait ${Math.ceil(RESEND_SECONDS - waited)} seconds before asking for another code.`, "wait");
  }

  // no more than a few emails an hour
  const inWindow = existing && existing.windowStart && now - existing.windowStart < DAY_MS;
  if (inWindow && existing.sendCount >= MAX_SENDS_PER_HOUR)
    throw new HttpError(429, "You've asked for too many codes. Please try again in about an hour.", "too_many");

  const code = newCode();
  const doc = await PendingSignup.findOneAndUpdate(
    { email },
    {
      $set: {
        ...patch,
        codeHash: hashCode(keyFor(email), code),
        expiresAt: new Date(now.getTime() + CODE_MINUTES * 60 * 1000),
        attempts: 0,
        lastSentAt: now,
        sendCount: inWindow ? existing.sendCount + 1 : 1,
        windowStart: inWindow ? existing.windowStart : now,
        expireAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  try {
    await sendSignupCodeEmail({
      to: email,
      firstName: doc.data.firstName,
      code,
      accountType: doc.data.accountType,
      minutes: CODE_MINUTES,
    });
  } catch (err) {
    if (!err.mailFailed) console.error("Could not send the sign-up code:", err);
    // nothing was delivered, so the code can't be used and doesn't count against the limits
    await PendingSignup.updateOne({ _id: doc._id }, { $set: { codeHash: null, lastSentAt: null }, $inc: { sendCount: -1 } });
    throw new HttpError(502, "We couldn't send the email right now. Please try again in a moment.", "email_failed");
  }

  return {
    email,
    sentTo: maskEmail(email),
    expiresInMinutes: CODE_MINUTES,
    resendAfterSeconds: RESEND_SECONDS,
  };
};

/* ---------- Step 1: check the form, then email a code. No account is made yet. ---------- */
router.post("/start", limiter, async (req, res) => {
  const { data, password, taxId } = parseSignup(req.body);
  await assertAvailable(data);

  const existing = await PendingSignup.findOne({ email: data.email });

  // the number the account will be created with, so the SSN/ITIN hash can be made now without saving the number
  const userKey = (existing && existing.data && existing.data.userKey) || newObjectId();

  const saved = {
    ...data,
    userKey,
    passwordHash: await bcrypt.hash(password, 12),
    taxIdHash: taxId ? hashTaxId(userKey, taxId) : null,
  };

  res.json(await issueCode(data.email, existing, { data: saved }));
});

/* ---------- Send a new code for a sign-up that is waiting ---------- */
router.post("/resend", limiter, async (req, res) => {
  const email = cleanEmail(req.body && req.body.email);
  const existing = await PendingSignup.findOne({ email });
  if (!existing) throw new HttpError(400, "This sign-up has expired. Please start again.", "expired");

  res.json(await issueCode(email, existing, {}));
});

/* ---------- Step 2: check the code. If it is right, the account is created. ---------- */
router.post("/verify", limiter, async (req, res) => {
  const email = cleanEmail(req.body && req.body.email);
  const code = String((req.body && req.body.code) || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from your email.");

  const now = new Date();
  const pending = await PendingSignup.findOne({ email });

  if (!pending || !pending.codeHash || !pending.expiresAt || pending.expiresAt <= now)
    throw new HttpError(400, "That code has expired. Request a new one.", "expired");

  if (pending.attempts >= MAX_ATTEMPTS)
    throw new HttpError(429, "Too many wrong codes. Request a new code.", "locked");

  if (!sameHash(pending.codeHash, hashCode(keyFor(email), code))) {
    const updated = await PendingSignup.findOneAndUpdate(
      { _id: pending._id, codeHash: pending.codeHash },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" }
    );
    const left = Math.max(MAX_ATTEMPTS - (updated ? updated.attempts : MAX_ATTEMPTS), 0);
    if (left === 0) throw new HttpError(429, "Too many wrong codes. Request a new code.", "locked");
    throw new HttpError(400, `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`, "wrong_code");
  }

  // right code: use it up first, so two quick requests can't make two accounts
  const claimed = await PendingSignup.findOneAndUpdate(
    { _id: pending._id, codeHash: pending.codeHash, attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { codeHash: null } },
    { returnDocument: "before" }
  );
  if (!claimed) throw new HttpError(400, "That code has expired. Request a new one.", "expired");

  const { userKey, passwordHash, taxIdHash, ...details } = pending.data;
  await assertAvailable(details); // someone else may have taken the User ID while this was waiting

  const user = await createAccount(details, { _id: userKey, passwordHash, taxIdHash: taxIdHash || null });
  await PendingSignup.deleteOne({ _id: pending._id });

  res.status(201).json({ token: signUserToken(user), user });
});

module.exports = router;