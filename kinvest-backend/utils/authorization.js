const OtpCode = require("../models/OtpCode");
const User = require("../models/User");
const { KINDS, encrypt, generate } = require("./transferCodes");
const { hashProof, newProof, PROOF_MINUTES } = require("./otp");

/*
  The admin-controlled checks before a transfer: the Cost of Transfer (COT) code and the Transfer
  Access Code (TAC). A customer only has to enter the ones the admin has switched ON for them.

  The customer enters each code on the website (routes/authorization.js). Once every required code
  is right, they get a one-time "proof" that is tied to the exact amount, type and recipient. The
  transfer route (routes/money.js) takes that proof before it moves any money.
*/

const MAX_ATTEMPTS = 5; // wrong guesses before a lock
const LOCK_MINUTES = 15;

// the codes the admin has switched on for this customer, for example ["cot"] or ["cot", "tac"]
const requiredKinds = (user) => KINDS.filter((k) => user && user.transferCodes && user.transferCodes[k] && user.transferCodes[k].enabled);

const proofHashFor = (userId, proof) => hashProof(userId, `authorization:${proof}`);

const selectCodes = "+transferCodes.cot.enc +transferCodes.tac.enc";

// loads a customer together with the encrypted codes, and creates any that are missing
// (customers who signed up before this feature existed get theirs the first time an admin opens them)
const loadWithCodes = async (userId) => {
  let user = await User.findById(userId).select(selectCodes);
  if (!user) return null;

  let created = false;
  for (const kind of KINDS) {
    const slot = user.transferCodes && user.transferCodes[kind];
    if (!slot || !slot.enc) {
      await User.updateOne(
        { _id: user._id, [`transferCodes.${kind}.enc`]: null },
        { $set: { [`transferCodes.${kind}.enc`]: encrypt(generate(kind)), [`transferCodes.${kind}.updatedAt`]: new Date() } }
      );
      created = true;
    }
  }
  if (created) user = await User.findById(userId).select(selectCodes);
  return user;
};

// takes the one-time proof right before the money moves. Works only if every code that is switched
// on right now was entered for THIS transfer, in time, and only once.
// returns { skipped: true } when no code is required, a record to restore, or null when it is missing or invalid
const consumeAuthorizationProof = async (user, proof, { amountCents, type, recipient }) => {
  const required = requiredKinds(user);
  if (required.length === 0) return { skipped: true };
  if (typeof proof !== "string" || proof.length < 16 || proof.length > 200) return null;

  const proofHash = proofHashFor(user._id, proof);
  const doc = await OtpCode.findOneAndUpdate(
    {
      userId: user._id,
      purpose: "authorization",
      proofHash,
      usedAt: null,
      proofExpiresAt: { $gt: new Date() },
      amountCents,
      type,
      recipient,
      verifiedKinds: { $all: required },
    },
    { $set: { usedAt: new Date(), proofHash: null } },
    { returnDocument: "before" }
  );
  return doc ? { id: doc._id, proofHash } : null;
};

// the transfer did not go through (for example, not enough balance), so the customer may try again
const restoreAuthorizationProof = (consumed) =>
  consumed && consumed.id
    ? OtpCode.updateOne({ _id: consumed.id }, { $set: { usedAt: null, proofHash: consumed.proofHash } })
    : null;

module.exports = {
  MAX_ATTEMPTS,
  LOCK_MINUTES,
  PROOF_MINUTES,
  requiredKinds,
  proofHashFor,
  newProof,
  loadWithCodes,
  consumeAuthorizationProof,
  restoreAuthorizationProof,
};
