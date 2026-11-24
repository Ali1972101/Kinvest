const mongoose = require("mongoose");

// a permanent record of what admins did to customer accounts
const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "top_up",
        "suspend",
        "reactivate",
        "blocked_transfer",
        "codes_view",
        "codes_enable",
        "codes_disable",
        "codes_regenerate",
      ],
      required: true,
    },
    amountCents: { type: Number },
    note: { type: String, default: "" },
    reason: { type: String, default: "" },
    at: { type: Date, default: Date.now, index: true },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        if (ret.userId) ret.userId = String(ret.userId);
        if (ret.amountCents !== undefined) ret.amount = ret.amountCents / 100;
        ret.at = new Date(ret.at).toISOString();
        delete ret._id;
        delete ret.__v;
        delete ret.amountCents;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
