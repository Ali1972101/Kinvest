// Email code for transfers. Uses the same request helper (and login token) as the rest of the app.
import { request } from "./api";

// Emails a 6-digit code to the address the customer signed up with.
// -> { sentTo: "j•••@gmail.com", expiresInMinutes, resendAfterSeconds }
export const sendTransferCode = ({ amount, type, recipient }) =>
  request("/api/otp/transfer/send", { method: "POST", body: { amount, type, recipient } });

// Checks the code. -> { proof }. Pass the proof to sendTransfer as emailProof.
export const confirmTransferCode = (code) =>
  request("/api/otp/transfer/verify", { method: "POST", body: { code }, quiet401: true });
