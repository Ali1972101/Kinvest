const mongoose = require("mongoose");

/*
  A sign-up waiting for its email code. The account is NOT created until the right code is entered.
  It holds the details the customer typed (the password only as a bcrypt hash), the code (only as a
  keyed hash), and the sending limits. The database removes it by itself after two hours.
*/
const pendingSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    data: { type: mongoose.Schema.Types.Mixed, required: true },

    codeHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },

    lastSentAt: { type: Date, default: null },
    sendCount: { type: Number, default: 0 },
    windowStart: { type: Date, default: null },

    expireAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingSignup", pendingSchema);