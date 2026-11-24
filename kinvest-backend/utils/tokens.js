const jwt = require("jsonwebtoken");

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set to a random string of at least 32 characters.");
  return s;
};

// make sure the secret is fine before the server starts
const assertSecret = () => secret();

const signUserToken = (user) =>
  jwt.sign({ sub: String(user._id), role: "user" }, secret(), { expiresIn: "2h" });

const signAdminToken = (email) =>
  jwt.sign({ sub: email, role: "admin" }, secret(), { expiresIn: "1h" });

// a short-lived pass that only allows one thing: choosing a new password.
// "jti" is a one-time code that is also stored on the account, so the pass works once.
const signRecoveryToken = (user, nonce) =>
  jwt.sign({ sub: String(user._id), role: "recover", jti: nonce }, secret(), { expiresIn: "15m" });

const verifyToken = (token) => jwt.verify(token, secret());

module.exports = { assertSecret, signUserToken, signAdminToken, signRecoveryToken, verifyToken };