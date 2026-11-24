const mongoose = require("mongoose");

/*
  One record per customer and purpose. It holds the current email code (as a keyed hash, never the
  code itself), how many wrong guesses were made, and, once the code is right, a one-time "proof"
  that the transfer route accepts. The proof is tied to the exact amount, type and recipient the
  code was requested for, so a code approved for one transfer cannot send a different one.
*/
const otpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, required: true, enum: ["transfer", "authorization"] },

    codeHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },

    // what this code is for
    amountCents: { type: Number, default: 0 },
    type: { type: String, default: "" },
    recipient: { type: String, default: "" },

    // "authorization" records: which admin codes (cot, tac) were entered correctly for this transfer,
    // and a lock after too many wrong guesses
    verifiedKinds: { type: [String], default: [] },
    lockedUntil: { type: Date, default: null },

    // sending limits
    lastSentAt: { type: Date, default: null },
    sendCount: { type: Number, default: 0 },
    windowStart: { type: Date, default: null },

    // after the right code is entered
    proofHash: { type: String, default: null },
    proofExpiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },

    // the database removes the record by itself after this time
    expireAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ userId: 1, purpose: 1 }, { unique: true });
otpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpCode", otpSchema);
