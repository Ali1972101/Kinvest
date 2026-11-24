const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const { HttpError } = require("../utils/errors");
const { signUserToken } = require("../utils/tokens");
const { hashTaxId } = require("../utils/taxId");
const { parseSignup, assertAvailable, createAccount } = require("../utils/signup");
const { str } = require("../utils/validate");

const router = express.Router();

// slows down password guessing and mass sign-ups
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

// used when the account doesn't exist, so a wrong User ID takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

/* ---------- Sign up ---------- */
// Accounts are made in two steps (see routes/signup.js): an emailed code must be entered first.
// This direct route only works if you switch email verification off with SIGNUP_EMAIL_VERIFICATION=false.
router.post("/register", authLimiter, async (req, res) => {
  if (process.env.SIGNUP_EMAIL_VERIFICATION !== "false")
    throw new HttpError(400, "Please confirm your email to create your account.", "verification_required");

  const { data, password, taxId } = parseSignup(req.body);
  await assertAvailable(data);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createAccount(data, { passwordHash });

  if (taxId) {
    await User.updateOne({ _id: user._id }, { $set: { taxIdHash: hashTaxId(user._id, taxId) } });
  }

  res.status(201).json({ token: signUserToken(user), user });
});

/* ---------- Log in (email or User ID) ---------- */
router.post("/login", authLimiter, async (req, res) => {
  const identifier = str(req.body && req.body.identifier).toLowerCase();
  const password = req.body && req.body.password;

  if (!identifier || typeof password !== "string" || !password)
    throw new HttpError(400, "Enter your email or User ID and your password.");

  const user = await User.findOne({
    $or: [{ email: identifier }, { userId: identifier }],
  }).select("+passwordHash");

  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Incorrect email, User ID or password.");

  res.json({ token: signUserToken(user), user });
});

module.exports = router;