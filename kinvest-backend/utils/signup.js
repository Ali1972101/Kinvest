const mongoose = require("mongoose");

const User = require("../models/User");
const { HttpError } = require("./errors");
const { generateAccountNumber, generateCard } = require("./cardGen");
const { cleanTaxId } = require("./taxId");
const { newTransferCodes } = require("./transferCodes");
const {
  ACCOUNT_TYPES,
  str,
  passwordProblem,
  cleanName,
  cleanEmail,
  cleanPhone,
  cleanAddress,
  cleanUserId,
} = require("./validate");

const isDuplicate = (err) => err && err.code === 11000;

// checks everything the customer typed, and returns it cleaned. Throws a clear message if something is wrong.
const parseSignup = (body) => {
  const b = body || {};

  const data = {
    firstName: cleanName(b.firstName, "first name"),
    lastName: cleanName(b.lastName, "last name"),
    email: cleanEmail(b.email),
    phone: cleanPhone(b.phone),
    address: cleanAddress(b.address),
    userId: cleanUserId(b.userId),
    accountType: str(b.accountType),
  };
  if (!ACCOUNT_TYPES.includes(data.accountType)) throw new HttpError(400, "Choose an account type.");

  const problem = passwordProblem(b.password);
  if (problem) throw new HttpError(400, problem);

  return {
    data,
    password: b.password,
    // optional: only used later to prove who you are when recovering your login
    taxId: b.taxId ? cleanTaxId(b.taxId) : null,
  };
};

const assertAvailable = async ({ email, userId }) => {
  if (await User.exists({ email })) throw new HttpError(409, "An account with this email already exists.");
  if (await User.exists({ userId: userId.toLowerCase() }))
    throw new HttpError(409, "That User ID is already taken. Please choose another.");
};

// makes the real account: number and card included. "extra" can hold passwordHash, taxIdHash and a preset _id.
const createAccount = async (data, extra) => {
  const holder = `${data.firstName} ${data.lastName}`;

  // the account number must be unique, so try again in the rare case of a clash
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await User.create({
        ...data,
        ...extra,
        transferCodes: newTransferCodes(), // COT and TAC: only an admin can see them
        accountNumber: generateAccountNumber(),
        card: generateCard(holder),
      });
    } catch (err) {
      if (!isDuplicate(err)) throw err;
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === "email") throw new HttpError(409, "An account with this email already exists.");
      if (field === "userId") throw new HttpError(409, "That User ID is already taken. Please choose another.");
      if (field === "_id") throw new HttpError(409, "This sign-up was already completed. Please log in.");
      // otherwise it was the account number: loop and generate a new one
    }
  }
  throw new HttpError(500, "We couldn't create your account. Please try again.");
};

const newObjectId = () => new mongoose.Types.ObjectId();

module.exports = { parseSignup, assertAvailable, createAccount, newObjectId };
