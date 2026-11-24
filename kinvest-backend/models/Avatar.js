const mongoose = require("mongoose");

// one profile picture per customer, kept as bytes so it survives every deploy
const avatarSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    contentType: { type: String, required: true, enum: ["image/png", "image/jpeg", "image/gif", "image/webp"] },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Avatar", avatarSchema);
