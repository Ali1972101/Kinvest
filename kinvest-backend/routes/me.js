const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Avatar = require("../models/Avatar");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../utils/errors");
const { cleanName, cleanPhone, cleanAddress, str } = require("../utils/validate");
const { cleanTaxId, hashTaxId } = require("../utils/taxId");

const router = express.Router();
router.use(requireAuth);

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many uploads. Please try again in a few minutes." },
});

/* ---------- The signed-in customer ---------- */
router.get("/", (req, res) => {
  res.json({ user: req.user });
});

// name and phone (the email, account number and card can't be changed here)
router.patch("/", async (req, res) => {
  const body = req.body || {};
  req.user.firstName = cleanName(body.firstName, "first name");
  req.user.lastName = body.lastName === "" ? req.user.lastName : cleanName(body.lastName, "last name");
  req.user.phone = cleanPhone(body.phone);
  // the name printed on the customer's card always follows their name
  req.user.set("card.holder", req.user.fullName());
  await req.user.save();
  res.json({ user: req.user });
});

router.put("/address", async (req, res) => {
  req.user.address = cleanAddress(req.body);
  await req.user.save();
  res.json({ user: req.user });
});

/* ---------- Date of birth ---------- */
router.get("/extras", (req, res) => {
  res.json({ extras: req.user.profileExtras || {} });
});

router.put("/extras", async (req, res) => {
  const body = req.body || {};

  const day = str(String(body.day ?? ""));
  const month = str(String(body.month ?? ""));
  const year = str(String(body.year ?? ""));
  const chosen = [day, month, year].filter(Boolean).length;
  if (chosen > 0 && chosen < 3) throw new HttpError(400, "Choose a day, month and year.");
  if (chosen === 3) {
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    const valid =
      Number.isInteger(d) && Number.isInteger(m) && Number.isInteger(y) &&
      m >= 0 && m <= 11 && y >= 1900 && y <= new Date().getFullYear() - 18 &&
      d >= 1 && d <= new Date(y, m + 1, 0).getDate();
    if (!valid) throw new HttpError(400, "Enter a valid birth date. You must be at least 18.");
  }

  req.user.profileExtras = { day, month, year };
  await req.user.save();
  res.json({ extras: req.user.profileExtras });
});

/* ---------------------------------------------------------------------------
   Profile picture (file upload)
   - The file is kept in memory, checked, then saved in MongoDB. Render's disk is wiped on
     every deploy, so saving files on disk would lose everyone's photo.
   - The type is read from the file's own bytes, not from the name or what the browser says.
   - SVG is refused on purpose, because an SVG can carry scripts.
--------------------------------------------------------------------------- */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
});

const readUpload = (req, res, next) =>
  upload.single("avatar")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(new HttpError(400, "Photo must be smaller than 2 MB."));
    return next(new HttpError(400, "We couldn't read that file. Please choose a different photo."));
  });

// works out the real image type from the first bytes of the file
const detectImageType = (buf) => {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
};

router.put("/avatar", uploadLimiter, readUpload, async (req, res) => {
  if (!req.file) throw new HttpError(400, "Choose a photo to upload.");

  const contentType = detectImageType(req.file.buffer);
  if (!contentType) throw new HttpError(400, "Please choose a PNG, JPG, WEBP or GIF image.");

  await Avatar.findOneAndUpdate(
    { userId: req.user._id },
    { contentType, data: req.file.buffer, size: req.file.size },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  req.user.avatarUpdatedAt = new Date();
  await req.user.save();

  res.json({ user: req.user });
});

// the website fetches this with the customer's token and shows the result
router.get("/avatar", async (req, res) => {
  const avatar = await Avatar.findOne({ userId: req.user._id });
  if (!avatar) throw new HttpError(404, "No photo yet.");

  res.set({
    "Content-Type": avatar.contentType,
    "Content-Length": String(avatar.data.length),
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": "inline",
  });
  res.send(avatar.data);
});

router.delete("/avatar", async (req, res) => {
  await Avatar.deleteOne({ userId: req.user._id });
  req.user.avatarUpdatedAt = null;
  await req.user.save();
  res.json({ user: req.user });
});

/* ---------- "Confirm with your password" ---------- */
router.post("/verify-password", verifyLimiter, async (req, res) => {
  const password = req.body && req.body.password;
  if (typeof password !== "string" || !password) throw new HttpError(400, "Enter your password.");

  const withHash = await User.findById(req.user._id).select("+passwordHash");
  const ok = await bcrypt.compare(password, withHash.passwordHash);
  if (!ok) throw new HttpError(401, "That password isn't correct.");

  res.json({ ok: true });
});

/* ---------- Save your SSN or ITIN (used only to prove who you are when recovering your login) ---------- */
router.put("/tax-id", verifyLimiter, async (req, res) => {
  const password = req.body && req.body.password;
  if (typeof password !== "string" || !password) throw new HttpError(400, "Enter your password.");
  const taxId = cleanTaxId(req.body && req.body.taxId);

  const withHash = await User.findById(req.user._id).select("+passwordHash");
  const ok = await bcrypt.compare(password, withHash.passwordHash);
  if (!ok) throw new HttpError(401, "That password isn't correct.");

  await User.updateOne({ _id: req.user._id }, { $set: { taxIdHash: hashTaxId(req.user._id, taxId) } });
  res.json({ ok: true });
});

/* ---------- Transactions (newest first) ---------- */
router.get("/transactions", async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
  const transactions = await Transaction.find({ userId: req.user._id }).sort({ at: -1 }).limit(limit);
  res.json({ transactions });
});

module.exports = router;