const crypto = require("crypto");

/*
  Cost of Transfer (COT) code and Transfer Access Code (TAC).

  Every customer gets both when the account is created. Only an admin can see them or switch them
  on and off. While a code is switched on for a customer, that customer must enter it before any
  transfer is sent (see routes/authorization.js and routes/money.js).

  The codes are kept ENCRYPTED (AES-256-GCM), not hashed, because the admin has to be able to read
  them out. They are never sent to the customer's website, and they are left out of every response
  except the admin routes.
*/

const KINDS = ["cot", "tac"];

const LABELS = {
  cot: "Cost of Transfer (COT) code",
  tac: "Transfer Access Code (TAC)",
};

// letters and numbers that cannot be mixed up when read out loud: no 0/O and no 1/I
const TAC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const key = () => {
  const secret = process.env.CODES_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Set JWT_SECRET (or CODES_SECRET) before using transfer codes.");
  return crypto.createHash("sha256").update(`transfer-codes:${secret}`).digest();
};

const b64 = (buf) => buf.toString("base64url");

const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b64).join(".");
};

// returns the code, or null if it cannot be read (for example the secret was changed)
const decrypt = (stored) => {
  try {
    const [iv, tag, data] = String(stored).split(".").map((p) => Buffer.from(p, "base64url"));
    if (!iv || !tag || !data) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};

const generate = (kind) => {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += kind === "cot" ? String(crypto.randomInt(0, 10)) : TAC_ALPHABET[crypto.randomInt(0, TAC_ALPHABET.length)];
  }
  return out;
};

// what the customer typed -> the plain code: "k7rm-4xq2" becomes "K7RM4XQ2"
const normalize = (input) => String(input == null ? "" : input).replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const sameCode = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// a fresh pair for a new account. Both start switched OFF: the admin decides when to require them.
const newTransferCodes = () => {
  const now = new Date();
  const slot = (kind) => ({ enc: encrypt(generate(kind)), enabled: false, updatedAt: now });
  return { cot: slot("cot"), tac: slot("tac") };
};

module.exports = {
  KINDS,
  LABELS,
  CODE_LENGTH,
  encrypt,
  decrypt,
  generate,
  normalize,
  sameCode,
  newTransferCodes,
};
