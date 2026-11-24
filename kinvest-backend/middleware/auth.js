const User = require("../models/User");
const { verifyToken } = require("../utils/tokens");
const { HttpError } = require("../utils/errors");

const readToken = (req) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
};

const decode = (req) => {
  const token = readToken(req);
  if (!token) throw new HttpError(401, "Please log in to continue.");
  try {
    return verifyToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please log in again.");
  }
};

// a signed-in customer. Loads the account fresh so a suspension applies straight away.
const requireAuth = async (req, res, next) => {
  const payload = decode(req);
  if (payload.role !== "user") throw new HttpError(403, "This area is for customers.");

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, "We couldn't find your account. Please log in again.");

  req.user = user;
  next();
};

// a signed-in admin
const requireAdmin = (req, res, next) => {
  const payload = decode(req);
  if (payload.role !== "admin") throw new HttpError(403, "Admins only.");
  req.admin = payload.sub;
  next();
};

module.exports = { requireAuth, requireAdmin };
