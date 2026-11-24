const { HttpError } = require("./errors");

// Money is stored as whole cents so that 0.1 + 0.2 can never go wrong.
const toCents = (dollars) => Math.round(Number(dollars) * 100);
const toDollars = (cents) => cents / 100;

// reads a dollar amount from the request and returns cents, or throws a 400
const parseAmount = (value, { min, max, label = "amount" }) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `Enter a valid ${label}.`);

  // no more than two decimal places
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6)
    throw new HttpError(400, `The ${label} can have at most two decimal places.`);

  if (min !== undefined && n < min)
    throw new HttpError(400, `The minimum ${label} is $${min.toLocaleString("en-US")}.`);
  if (max !== undefined && n > max)
    throw new HttpError(400, `The maximum ${label} is $${max.toLocaleString("en-US")}.`);

  return toCents(n);
};

const envNumber = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

module.exports = { toCents, toDollars, parseAmount, envNumber };
