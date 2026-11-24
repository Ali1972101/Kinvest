const crypto = require("crypto");

const randomDigits = (n) => {
  let out = "";
  while (out.length < n) out += String(crypto.randomInt(0, 10));
  return out;
};

// the standard card-number checksum digit
const luhnCheckDigit = (partial) => {
  let sum = 0;
  let double = true;
  for (let i = partial.length - 1; i >= 0; i--) {
    let n = Number(partial[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
};

const generateAccountNumber = () => String(crypto.randomInt(1, 10)) + randomDigits(9);

/*
  DEMO CARD. This makes a test-style Mastercard number so the app has something to show.
  In production, cards must be issued by a card processor (Stripe Issuing, Marqeta and so on),
  and the full number and CVV must never be stored in your own database.
*/
const generateCard = (holder) => {
  const partial = `5${crypto.randomInt(1, 6)}${randomDigits(13)}`; // 51 to 55
  const digits = partial + luhnCheckDigit(partial);
  const now = new Date();

  return {
    brand: "Mastercard",
    number: digits.replace(/(.{4})/g, "$1 ").trim(),
    holder: holder.toUpperCase(),
    expiry: `${String(now.getMonth() + 1).padStart(2, "0")}/${String((now.getFullYear() + 4) % 100).padStart(2, "0")}`,
    cvv: randomDigits(3),
    issuedAt: now,
  };
};

module.exports = { generateAccountNumber, generateCard };
