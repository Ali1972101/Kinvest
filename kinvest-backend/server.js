require("dotenv").config();

// use Google DNS so the MongoDB Atlas address can be found (same fix as the QA backend)
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const { assertSecret } = require("./utils/tokens");
const { mailProvider, parseFrom } = require("./utils/mailer");

const authRoutes = require("./routes/auth");
const recoverRoutes = require("./routes/recover");
const otpRoutes = require("./routes/otp");
const authorizationRoutes = require("./routes/authorization");
const signupRoutes = require("./routes/signup");
const meRoutes = require("./routes/me");
const moneyRoutes = require("./routes/money");
const adminRoutes = require("./routes/admin");
const contactRoutes = require("./routes/contact");

const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

const app = express();

// Render sits behind a proxy, so this makes rate limits use the real visitor address
app.set("trust proxy", 1);
app.disable("x-powered-by");
// the website is on another address, so it must be allowed to load pictures from this API
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

/* ---------- CORS: only your website may call this API ---------- */
const allowed = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

if (isProd && allowed.length === 0) {
  console.error("FRONTEND_URL must be set in production.");
  process.exit(1);
}

app.use(
  cors({
    origin(origin, callback) {
      // no Origin header means a tool like curl or a health check, not a browser
      if (!origin) return callback(null, true);
      if (allowed.length === 0 && !isProd) return callback(null, true); // local development only
      return callback(null, allowed.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// profile photos arrive as small data URLs, so allow a little more than the default
app.use(express.json({ limit: "3mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

/* ---------- Routes ---------- */
app.get("/health", (req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 });
});

app.use("/api/auth/recover", recoverRoutes);
app.use("/api/auth/signup", signupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes); // public: the Contact Us form
app.use("/api/me", meRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/transfers/authorization", authorizationRoutes); // COT / TAC codes (before the money routes)
app.use("/api", moneyRoutes); // /api/transfers and /api/topups/card
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

/* ---------- Errors: customers get a clear message, never a stack trace ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === "entity.too.large")
    return res.status(413).json({ message: "That upload is too large." });
  if (err && err.type === "entity.parse.failed")
    return res.status(400).json({ message: "The request wasn't valid JSON." });

  if (err && err.status && err.status < 500)
    return res.status(err.status).json({ message: err.message, ...(err.code ? { code: err.code } : {}) });

  if (err && err.name === "ValidationError")
    return res.status(400).json({ message: "Some of the details aren't valid." });

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

/* ---------- Start ---------- */
const start = async () => {
  assertSecret();
  await connectDB();

  const server = app.listen(PORT, () => console.log(`Kinqora API running on port ${PORT}`));

  // say clearly how emailed codes will be sent, so a missing setting is noticed straight away
  const provider = mailProvider();
  if (provider) console.log(`Email: sending with ${provider} from ${parseFrom().email || "(MAIL_FROM not set)"}`);
  else if (isProd) console.error("Email: NO provider set. Sign-up and transfer codes cannot be sent. Set BREVO_API_KEY and MAIL_FROM.");
  else console.log("Email: no provider set, so codes are printed in this terminal instead of being emailed.");

  const shutdown = (signal) => {
    console.log(`Received ${signal}. Closing...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((err) => {
  console.error("Could not start the server:", err.message);
  process.exit(1);
});

module.exports = app;
