const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AdminLog = require("../models/AdminLog");
const { requireAdmin } = require("../middleware/auth");
const { HttpError } = require("../utils/errors");
const { parseAmount, envNumber } = require("../utils/money");
const { signAdminToken } = require("../utils/tokens");
const { str } = require("../utils/validate");
const { KINDS, LABELS, decrypt, encrypt, generate } = require("../utils/transferCodes");
const { loadWithCodes } = require("../utils/authorization");
const OtpCode = require("../models/OtpCode");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

// compares two strings in constant time
const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const validId = (id) => mongoose.isValidObjectId(id);

/* ---------- Admin sign-in ---------- */
router.post("/login", loginLimiter, (req, res) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminEmail || !adminPassword) throw new HttpError(503, "The admin console is switched off.");

  const email = str(req.body && req.body.email).toLowerCase();
  const password = req.body && req.body.password;

  const okEmail = safeEqual(email, adminEmail);
  const okPassword = typeof password === "string" && safeEqual(password, adminPassword);
  if (!okEmail || !okPassword) throw new HttpError(401, "Incorrect admin email or password.");

  res.json({ token: signAdminToken(adminEmail), admin: adminEmail });
});

router.use(requireAdmin);

/* ---------- Customers ---------- */
router.get("/users", async (req, res) => {
  const search = str(req.query.search);
  const filter = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { userId: rx }, { accountNumber: rx }];
  }

  // card numbers and photos are left out on purpose
  const docs = await User.find(filter).select("-card -profileExtras").sort({ createdAt: -1 }).limit(500);
  // which transfer codes are switched on for each customer (the codes themselves are not in this list)
  const users = docs.map((u) => ({
    ...u.toJSON(),
    transferAuth: {
      cot: Boolean(u.transferCodes && u.transferCodes.cot && u.transferCodes.cot.enabled),
      tac: Boolean(u.transferCodes && u.transferCodes.tac && u.transferCodes.tac.enabled),
    },
  }));
  res.json({ users });
});

/* ---------- Add money to a customer ---------- */
router.post("/users/:id/top-up", async (req, res) => {
  if (!validId(req.params.id)) throw new HttpError(404, "Customer not found.");

  const body = req.body || {};
  const amountCents = parseAmount(body.amount, {
    min: 0.01,
    max: envNumber("ADMIN_MAX_TOPUP_USD", envNumber("MAX_TOPUP_USD", 100000000)),
    label: "top up",
  });
  // who the money is from: the admin types this, it is not the bank
  const sender = str(body.sender).slice(0, 80);
  if (sender.length < 2) throw new HttpError(400, "Enter the name of the person or company sending the money.");
  const note = str(body.note).slice(0, 120);

  // the date of the transfer: the admin chooses it (YYYY-MM-DD). Not in the future, and no
  // older than 10 years. Today means "right now".
  const dateText = str(body.date);
  let at = new Date();
  if (dateText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new HttpError(400, "Enter a valid transfer date.");
    const chosen = new Date(`${dateText}T12:00:00Z`);
    if (Number.isNaN(chosen.getTime()) || chosen.toISOString().slice(0, 10) !== dateText)
      throw new HttpError(400, "Enter a valid transfer date.");
    const now = new Date();
    const tenYearsAgo = new Date(now);
    tenYearsAgo.setUTCFullYear(now.getUTCFullYear() - 10);
    // a day and a half of room, because the admin's "today" can be ahead of the server's
    if (chosen.getTime() > now.getTime() + 36 * 60 * 60 * 1000)
      throw new HttpError(400, "The transfer date can't be in the future.");
    if (chosen < tenYearsAgo) throw new HttpError(400, "The transfer date is too far in the past.");
    // never later than right now, so it can't show up as a future transaction
    at = chosen.getTime() > now.getTime() ? now : chosen;
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { $inc: { balanceCents: amountCents } },
    { returnDocument: "after" }
  );
  if (!updated) throw new HttpError(404, "Customer not found.");

  await Transaction.create({
    userId: updated._id,
    name: `Received from ${sender}`,
    category: note || "Money received",
    amountCents,
    icon: "down",
    at,
  });
  await AdminLog.create({
    admin: req.admin,
    userId: updated._id,
    userName: updated.fullName(),
    type: "top_up",
    amountCents,
    note: `From ${sender} · dated ${at.toISOString().slice(0, 10)}${note ? ` · ${note}` : ""}`,
  });

  res.json({ user: updated });
});

/* ---------- Suspend or reactivate ---------- */
router.post("/users/:id/status", async (req, res) => {
  if (!validId(req.params.id)) throw new HttpError(404, "Customer not found.");

  const status = req.body && req.body.status;
  if (!["active", "suspended"].includes(status)) throw new HttpError(400, "Choose active or suspended.");

  const reason = str(req.body.reason).slice(0, 300);
  if (status === "suspended" && !reason) throw new HttpError(400, "Enter a reason for the suspension.");

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { status, statusReason: status === "suspended" ? reason : "", statusChangedAt: new Date() },
    { returnDocument: "after" }
  );
  if (!updated) throw new HttpError(404, "Customer not found.");

  await AdminLog.create({
    admin: req.admin,
    userId: updated._id,
    userName: updated.fullName(),
    type: status === "suspended" ? "suspend" : "reactivate",
    reason,
  });

  res.json({ user: updated });
});

/* ---------------------------------------------------------------------------
   Transfer codes: Cost of Transfer (COT) and Transfer Access Code (TAC).
   Only an admin can read them. Every customer gets both when they sign up; the admin switches each
   one on or off. While one is ON, that customer must enter it before a transfer is sent.
--------------------------------------------------------------------------- */
const codesView = (user) => {
  const out = {};
  for (const kind of KINDS) {
    const slot = (user.transferCodes && user.transferCodes[kind]) || {};
    out[kind] = {
      label: LABELS[kind],
      code: slot.enc ? decrypt(slot.enc) : null, // null means it cannot be read: generate a new one
      enabled: Boolean(slot.enabled),
      updatedAt: slot.updatedAt || null,
    };
  }
  return out;
};

const kindFrom = (value) => {
  if (!KINDS.includes(value)) throw new HttpError(400, "Choose the COT code or the Transfer Access Code.");
  return value;
};

router.get("/users/:id/transfer-codes", async (req, res) => {
  if (!validId(req.params.id)) throw new HttpError(404, "Customer not found.");
  const user = await loadWithCodes(req.params.id);
  if (!user) throw new HttpError(404, "Customer not found.");

  await AdminLog.create({
    admin: req.admin,
    userId: user._id,
    userName: user.fullName(),
    type: "codes_view",
  });
  res.json({ codes: codesView(user) });
});

// body: { cot: true | false, tac: true | false }  (send one or both)
router.put("/users/:id/transfer-codes", async (req, res) => {
  if (!validId(req.params.id)) throw new HttpError(404, "Customer not found.");
  const body = req.body || {};
  const changes = KINDS.filter((k) => typeof body[k] === "boolean");
  if (changes.length === 0) throw new HttpError(400, "Choose which code to switch on or off.");

  const before = await loadWithCodes(req.params.id); // makes sure both codes exist before one is switched on
  if (!before) throw new HttpError(404, "Customer not found.");

  const set = {};
  for (const kind of changes) {
    set[`transferCodes.${kind}.enabled`] = body[kind];
    set[`transferCodes.${kind}.updatedAt`] = new Date();
  }
  await User.updateOne({ _id: before._id }, { $set: set });

  for (const kind of changes) {
    const was = Boolean(before.transferCodes[kind].enabled);
    if (was === body[kind]) continue;
    await AdminLog.create({
      admin: req.admin,
      userId: before._id,
      userName: before.fullName(),
      type: body[kind] ? "codes_enable" : "codes_disable",
      note: LABELS[kind],
    });
  }

  const after = await loadWithCodes(req.params.id);
  res.json({ codes: codesView(after) });
});

// body: { kind: "cot" | "tac" }  gives the customer a brand new code (the old one stops working)
router.post("/users/:id/transfer-codes/regenerate", async (req, res) => {
  if (!validId(req.params.id)) throw new HttpError(404, "Customer not found.");
  const kind = kindFrom(req.body && req.body.kind);

  const user = await loadWithCodes(req.params.id);
  if (!user) throw new HttpError(404, "Customer not found.");

  await User.updateOne(
    { _id: user._id },
    { $set: { [`transferCodes.${kind}.enc`]: encrypt(generate(kind)), [`transferCodes.${kind}.updatedAt`]: new Date() } }
  );
  // anything the customer already entered for the old code no longer counts
  await OtpCode.deleteOne({ userId: user._id, purpose: "authorization" });

  await AdminLog.create({
    admin: req.admin,
    userId: user._id,
    userName: user.fullName(),
    type: "codes_regenerate",
    note: LABELS[kind],
  });

  const after = await loadWithCodes(req.params.id);
  res.json({ codes: codesView(after) });
});

/* ---------- Activity log ---------- */
router.get("/log", async (req, res) => {
  const log = await AdminLog.find().sort({ at: -1 }).limit(300);
  res.json({ log });
});

module.exports = router;
