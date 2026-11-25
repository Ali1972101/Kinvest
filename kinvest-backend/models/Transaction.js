const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 120, default: "" },
    // positive = money in, negative = money out, in whole cents
    amountCents: { type: Number, required: true },
    feeCents: { type: Number, default: 0 },
    icon: { type: String, default: "transfer" },
    tone: { type: String, default: "plain" },
    reference: { type: String, trim: true, maxlength: 80, default: "" },
    // where a transfer was sent: the recipient's bank, routing number or SWIFT code, and the bank's address
    details: {
      type: new mongoose.Schema(
        {
          bank: { type: String, trim: true, maxlength: 60 },
          routingNumber: { type: String, trim: true, maxlength: 9 },
          swift: { type: String, trim: true, maxlength: 11 },
          country: { type: String, trim: true, maxlength: 2 },
          accountLast4: { type: String, trim: true, maxlength: 4 },
          bankAddress: {
            line1: { type: String, trim: true, maxlength: 80 },
            city: { type: String, trim: true, maxlength: 60 },
            state: { type: String, trim: true, maxlength: 60 },
            zip: { type: String, trim: true, maxlength: 12 },
          },
        },
        { _id: false }
      ),
      default: undefined,
    },
    at: { type: Date, default: Date.now, index: true },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        ret.amount = ret.amountCents / 100;
        ret.fee = (ret.feeCents || 0) / 100;
        ret.at = new Date(ret.at).toISOString();
        delete ret._id;
        delete ret.__v;
        delete ret.amountCents;
        delete ret.feeCents;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
