const { HttpError } = require("./errors");

/*
  Details of the bank a domestic transfer is going to: routing number and the bank's address.
  The website checks these too, but the server never trusts the website, so they are checked again here.
*/

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "PR", "GU", "VI", "AS", "MP",
];

const text = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// A US routing number (ABA) has 9 digits and a check digit: 3(d1+d4+d7) + 7(d2+d5+d8) + (d3+d6+d9) is a multiple of 10
const isValidRouting = (value) => {
  if (!/^\d{9}$/.test(value)) return false;
  // the first two digits are the Federal Reserve district: 01-12, 21-32, 61-72 or 80
  const prefix = Number(value.slice(0, 2));
  if (!((prefix >= 1 && prefix <= 12) || (prefix >= 21 && prefix <= 32) || (prefix >= 61 && prefix <= 72) || prefix === 80))
    return false;
  const d = value.split("").map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
};

/*
  Reads and checks the recipient's bank details sent with a domestic transfer.
  Returns what should be saved with the transaction. Account numbers are saved masked (last 4 digits only).
*/
const parseDomesticDetails = (raw) => {
  const body = raw && typeof raw === "object" ? raw : {};

  const bank = text(body.bank, 60);
  if (bank.length < 2) throw new HttpError(400, "Enter the recipient's bank.");

  const routingNumber = String(body.routingNumber == null ? "" : body.routingNumber).replace(/\D/g, "");
  if (!isValidRouting(routingNumber))
    throw new HttpError(400, "That routing number isn't valid. Please check the 9 digits.", "invalid_routing");

  const accountDigits = String(body.accountNumber == null ? "" : body.accountNumber).replace(/\D/g, "");
  if (!/^\d{10}$/.test(accountDigits)) throw new HttpError(400, "Enter the recipient's 10-digit account number.");

  const address = body.bankAddress && typeof body.bankAddress === "object" ? body.bankAddress : {};
  const line1 = text(address.line1, 80);
  const city = text(address.city, 60);
  const state = text(address.state, 2).toUpperCase();
  const zip = text(address.zip, 10);

  if (line1.length < 5) throw new HttpError(400, "Enter the bank's street address.");
  if (city.length < 2) throw new HttpError(400, "Enter the bank's city.");
  if (!US_STATES.includes(state)) throw new HttpError(400, "Choose the bank's state.");
  if (!/^\d{5}(-\d{4})?$/.test(zip)) throw new HttpError(400, "Enter a valid ZIP code for the bank.");

  return {
    bank,
    routingNumber,
    accountLast4: accountDigits.slice(-4),
    bankAddress: { line1, city, state, zip },
  };
};

/*
  Details of the bank an international transfer is going to: SWIFT/BIC code, country and the bank's address.
  The region and postal code follow each country's own format, so they are only checked for length.
*/
const parseInternationalDetails = (raw) => {
  const body = raw && typeof raw === "object" ? raw : {};

  const bank = text(body.bank, 60);
  if (bank.length < 2) throw new HttpError(400, "Enter the recipient's bank.");

  const swift = String(body.swift == null ? "" : body.swift).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift))
    throw new HttpError(400, "That SWIFT/BIC code isn't valid.", "invalid_swift");

  const country = text(body.country, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new HttpError(400, "Choose the destination country.");

  const accountNumber = String(body.accountNumber == null ? "" : body.accountNumber).replace(/\s/g, "");
  if (!/^[A-Za-z0-9]{6,34}$/.test(accountNumber)) throw new HttpError(400, "Enter the recipient's account number.");

  const address = body.bankAddress && typeof body.bankAddress === "object" ? body.bankAddress : {};
  const line1 = text(address.line1, 80);
  const city = text(address.city, 60);
  const region = text(address.state, 60);
  const postal = text(address.zip, 12);

  if (line1.length < 5) throw new HttpError(400, "Enter the bank's street address.");
  if (city.length < 2) throw new HttpError(400, "Enter the bank's city.");
  if (postal.length < 3) throw new HttpError(400, "Enter the bank's postal code.");

  return {
    bank,
    swift,
    country,
    accountLast4: accountNumber.slice(-4),
    bankAddress: { line1, city, state: region, zip: postal },
  };
};

module.exports = { US_STATES, isValidRouting, parseDomesticDetails, parseInternationalDetails };
