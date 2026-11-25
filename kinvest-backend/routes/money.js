const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AdminLog = require("../models/AdminLog");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../utils/errors");
const { parseAmount, envNumber, toCents } = require("../utils/money");
const { str } = require("../utils/validate");
const { parseDomesticDetails, parseInternationalDetails } = require("../utils/bank");
const { consumeTransferProof, restoreTransferProof } = require("../utils/otp");
const { consumeAuthorizationProof, restoreAuthorizationProof } = require("../utils/authorization");

const router = express.Router();

const SUPPORT_EMAIL = "support@kinvest.com";
const SUSPENDED_MESSAGE = `Your account has been suspended. Please contact us at ${SUPPORT_EMAIL}.`;

const moneyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait a moment." },
});

const makeReference = (prefix) =>
  `${prefix}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

/* ---------------------------------------------------------------------------
   Send money.
   The balance check and the debit happen in ONE database step, so two requests at the
   same time can never spend the same money twice. The fee and the minimum are decided
   here on the server, never taken from the website.
--------------------------------------------------------------------------- */
router.post("/transfers", requireAuth, moneyLimiter, async (req, res) => {
  const body = req.body || {};

  const type = body.type;
  if (!["domestic", "international"].includes(type))
    throw new HttpError(400, "Choose a domestic or international transfer.");
  const international = type === "international";

  const recipient = str(body.recipient).slice(0, 80);
  if (!recipient) throw new HttpError(400, "Enter the recipient's name.");

  // every transfer needs the recipient's bank details and the bank's address
  const details = international
    ? parseInternationalDetails(body.recipientDetails)
    : parseDomesticDetails(body.recipientDetails);

  const amountCents = parseAmount(body.amount, {
    min: international ? envNumber("MIN_INTERNATIONAL_USD", 10) : envNumber("MIN_DOMESTIC_USD", 1),
    max: envNumber("MAX_TRANSFER_USD", 100000000),
    label: "transfer amount",
  });
  const feeCents = toCents(international ? envNumber("INTERNATIONAL_FEE_USD", 15) : envNumber("DOMESTIC_FEE_USD", 0));
  const totalCents = amountCents + feeCents;
  const reference = makeReference("TR");

  // 1) the codes the admin has switched on for this customer (COT and/or TAC), entered for exactly this transfer
  const authorization = await consumeAuthorizationProof(req.user, body.authProof, { amountCents, type, recipient });
  if (!authorization)
    throw new HttpError(
      403,
      "This transfer needs an authorization code. Please enter your code and try again.",
      "authorization_required"
    );

  // 2) the code we emailed for exactly this transfer.
  // Set TRANSFER_CODE_REQUIRED=false to switch this off (not recommended).
  let proof = null;
  if (process.env.TRANSFER_CODE_REQUIRED !== "false") {
    proof = await consumeTransferProof(req.user._id, body.emailProof, { amountCents, type, recipient });
    if (!proof) {
      await restoreAuthorizationProof(authorization); // the admin code was right, so keep it usable
      throw new HttpError(
        403,
        "Please confirm this transfer with the code we emailed you.",
        "code_required"
      );
    }
  }

  const updated = await User.findOneAndUpdate(
    { _id: req.user._id, status: "active", balanceCents: { $gte: totalCents } },
    { $inc: { balanceCents: -totalCents } },
    { returnDocument: "after" }
  );

  if (!updated) {
    await restoreTransferProof(proof); // nothing was sent, so the codes stay usable
    await restoreAuthorizationProof(authorization);
    const current = await User.findById(req.user._id);
    if (current && current.status === "suspended") {
      await AdminLog.create({
        admin: "System",
        userId: current._id,
        userName: current.fullName(),
        type: "blocked_transfer",
      });
      throw new HttpError(403, SUSPENDED_MESSAGE, "suspended");
    }
    throw new HttpError(400, "You don't have enough balance for this transfer and its fee.", "insufficient_funds");
  }

  try {
    const transaction = await Transaction.create({
      userId: updated._id,
      name: `Transfer to ${recipient}`,
      category: `${international ? "International" : "Domestic"} transfer`,
      amountCents: -totalCents,
      feeCents,
      icon: "up",
      reference,
      details,
    });
    res.status(201).json({
      transaction,
      user: updated,
      reference,
      fee: feeCents / 100,
      total: totalCents / 100,
    });
  } catch (err) {
    // the record failed to save, so give the money back
    await User.updateOne({ _id: updated._id }, { $inc: { balanceCents: totalCents } });
    await restoreTransferProof(proof);
    await restoreAuthorizationProof(authorization);
    throw err;
  }
});

/* ---------------------------------------------------------------------------
   Add money with a card.
   SWITCHED OFF BY DEFAULT. This route credits the account without charging a card, which
   is only safe for demos. Before launch, charge the card with a payment provider (Stripe,
   Paystack, Flutterwave...) and credit the account from the provider's signed webhook,
   not from this route.
--------------------------------------------------------------------------- */
router.post("/topups/card", requireAuth, moneyLimiter, async (req, res) => {
  if (process.env.ALLOW_DEMO_TOPUP !== "true")
    throw new HttpError(501, "Card top ups aren't switched on yet.", "topup_disabled");

  const body = req.body || {};
  const amountCents = parseAmount(body.amount, {
    min: 5,
    max: envNumber("MAX_TOPUP_USD", 100000000),
    label: "top up",
  });
  const reference = makeReference("TU");

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $inc: { balanceCents: amountCents } },
    { returnDocument: "after" }
  );

  const last4 = (req.user.card && req.user.card.number ? req.user.card.number : "").replace(/\s/g, "").slice(-4);
  const transaction = await Transaction.create({
    userId: updated._id,
    name: "Top up from card",
    category: `${req.user.card.brand} •••• ${last4}`,
    amountCents,
    icon: "down",
    reference,
  });

  res.status(201).json({ transaction, user: updated, reference });
});

module.exports = router;
