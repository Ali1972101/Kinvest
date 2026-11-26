const mongoose = require("mongoose");
const { ACCOUNT_TYPES } = require("../utils/validate");

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { _id: false }
);

// DEMO ONLY: see utils/cardGen.js. Use tokens from a card processor in production.
const cardSchema = new mongoose.Schema(
  {
    brand: String,
    number: String,
    holder: String,
    expiry: String,
    cvv: String,
    issuedAt: Date,
  },
  { _id: false }
);

// Cost of Transfer / Transfer Access code. Admin only: the code is encrypted and never selected by default.
const codeSlotSchema = new mongoose.Schema(
  {
    enc: { type: String, default: null, select: false },
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: addressSchema, default: null },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true },
    userId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    accountNumber: { type: String, required: true, unique: true },
    card: { type: cardSchema, required: true },
    passwordHash: { type: String, required: true, select: false },

    // whole cents, never below zero
    balanceCents: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ["active", "suspended"], default: "active" },
    statusReason: { type: String, default: "" },
    statusChangedAt: { type: Date },

    // SSN or ITIN, kept only as a keyed hash (see utils/taxId.js). Never stored or sent back in plain form.
    taxIdHash: { type: String, select: false, default: null },

    // account recovery: wrong-guess counter, temporary lock, and the one-time code of the current recovery
    recoveryFailures: { type: Number, default: 0, select: false },
    recoveryLockedUntil: { type: Date, default: null, select: false },
    recoveryNonce: { type: String, default: null, select: false },

    transferCodes: {
      cot: { type: codeSlotSchema, default: () => ({}) },
      tac: { type: codeSlotSchema, default: () => ({}) },
    },

    // the photo itself lives in the Avatar collection; this only says when it last changed
    avatarUpdatedAt: { type: Date, default: null },

    // date of birth
    profileExtras: {
      day: { type: String, default: "" },
      month: { type: String, default: "" },
      year: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        ret.balance = (ret.balanceCents || 0) / 100; // dollars, as the app expects
        ret.hasAvatar = Boolean(ret.avatarUpdatedAt);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.taxIdHash;
        delete ret.recoveryFailures;
        delete ret.recoveryLockedUntil;
        delete ret.recoveryNonce;
        delete ret.transferCodes; // admin only: the admin routes add what the admin may see
        delete ret.balanceCents;
        // the name on the card is always the customer's current name, even on cards made before a name change
        if (ret.card) ret.card = { ...ret.card, holder: [ret.firstName, ret.lastName].filter(Boolean).join(" ") };
        return ret;
      },
    },
  }
);

userSchema.methods.fullName = function fullName() {
  return [this.firstName, this.lastName].filter(Boolean).join(" ");
};

module.exports = mongoose.model("User", userSchema);
