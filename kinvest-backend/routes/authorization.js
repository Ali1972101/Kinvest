const express = require("express");
const rateLimit = require("express-rate-limit");

const OtpCode = require("../models/OtpCode");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../utils/errors");
const { parseAmount, envNumber } = require("../utils/money");
const { str } = require("../utils/validate");
const { KINDS, LABELS, decrypt, normalize, sameCode } = require("../utils/transferCodes");
const {
  MAX_ATTEMPTS,
  LOCK_MINUTES,
  PROOF_MINUTES,
  requiredKinds,
  proofHashFor,
  newProof,
  loadWithCodes,
} = require("../utils/authorization");

const router = express.Router();
router.use(requireAuth);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const SUPPORT_EMAIL = "support@kinqora.com";
const HOUR = 60 * 60 * 1000;

const assertActive = (user) => {
  if (user.status === "suspended")
    throw new HttpError(403, `Your account has been suspended. Please contact us at ${SUPPORT_EMAIL}.`, "suspended");
};

/* ---------- Which codes does this customer have to enter right now? ---------- */
// -> { required: ["cot", "tac"], labels: { cot: "...", tac: "..." } }  (empty when the admin has none switched on)
router.get("/", async (req, res) => {
  assertActive(req.user);
  const required = requiredKinds(req.user);
  res.json({ required, labels: Object.fromEntries(required.map((k) => [k, LABELS[k]])) });
});

/* ---------- Check one code ---------- */
// body: { kind: "cot" | "tac", code, amount, type, recipient }
// -> { remaining: ["tac"], proof: null }  or, once every required code is right,  { remaining: [], proof: "..." }
router.post("/verify", limiter, async (req, res) => {
  assertActive(req.user);

  const body = req.body || {};
  const kind = body.kind;
  if (!KINDS.includes(kind)) throw new HttpError(400, "Unknown code type.");

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

  const userId = req.user._id;
  const now = new Date();
  const user = await loadWithCodes(userId);
  const required = requiredKinds(user);

  // the admin switched everything off in the meantime: nothing to enter
  if (required.length === 0) return res.json({ remaining: [], proof: null });
  if (!required.includes(kind)) throw new HttpError(400, "That code isn't needed for this transfer.");

  const code = normalize(body.code);
  if (code.length < 4 || code.length > 20) throw new HttpError(400, "Enter the code exactly as you were given it.");

  const record = await OtpCode.findOne({ userId, purpose: "authorization" });

  if (record && record.lockedUntil && record.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((record.lockedUntil - now) / 60000));
    throw new HttpError(
      429,
      `Too many incorrect codes. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      "locked"
    );
  }

  // a different transfer than the one the earlier codes were entered for: start again
  const sameTransfer =
    record && record.amountCents === amountCents && record.type === type && record.recipient === recipient;
  const verified = sameTransfer ? record.verifiedKinds.filter((k) => required.includes(k)) : [];

  const stored = decrypt(user.transferCodes[kind].enc);
  const right = stored !== null && sameCode(code, stored);

  if (!right) {
    const priorAttempts = record && (!record.lockedUntil || record.lockedUntil <= now) ? record.attempts : 0;
    const attempts = priorAttempts + 1;
    const locked = attempts >= MAX_ATTEMPTS;

    await OtpCode.findOneAndUpdate(
      { userId, purpose: "authorization" },
      {
        $set: {
          attempts: locked ? 0 : attempts,
          lockedUntil: locked ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null,
          amountCents,
          type,
          recipient,
          verifiedKinds: verified,
          proofHash: null,
          proofExpiresAt: null,
          usedAt: null,
          expireAt: new Date(now.getTime() + HOUR),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    if (locked)
      throw new HttpError(
        429,
        `Too many incorrect codes. Please try again in ${LOCK_MINUTES} minutes.`,
        "locked"
      );
    const left = MAX_ATTEMPTS - attempts;
    throw new HttpError(
      400,
      `That ${kind === "cot" ? "COT code" : "Transfer Access Code"} isn't correct. ${left} attempt${left === 1 ? "" : "s"} left.`,
      "invalid_code"
    );
  }

  // right code
  if (!verified.includes(kind)) verified.push(kind);
  const remaining = required.filter((k) => !verified.includes(k));

  let proof = null;
  const set = {
    attempts: 0,
    lockedUntil: null,
    amountCents,
    type,
    recipient,
    verifiedKinds: verified,
    proofHash: null,
    proofExpiresAt: null,
    usedAt: null,
    expireAt: new Date(now.getTime() + HOUR),
  };
  if (remaining.length === 0) {
    proof = newProof();
    set.proofHash = proofHashFor(userId, proof);
    set.proofExpiresAt = new Date(now.getTime() + PROOF_MINUTES * 60000);
  }

  await OtpCode.findOneAndUpdate({ userId, purpose: "authorization" }, { $set: set }, { upsert: true, setDefaultsOnInsert: true });

  res.json({ remaining, proof });
});

module.exports = router;
