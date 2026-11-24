// Cost of Transfer (COT) and Transfer Access Code (TAC): the codes the admin can switch on for a customer.
import { request } from "./api";

// Which codes does this customer have to enter right now? -> { required: ["cot", "tac"], labels }
// An empty list means the admin has none switched on, so the transfer can go straight to the password.
export const getTransferAuthorization = () => request("/api/transfers/authorization");

// Checks one code for this exact transfer.
// -> { remaining: ["tac"], proof: null }  or, when every required code is right, { remaining: [], proof: "..." }
export const verifyTransferCode = ({ kind, code, amount, type, recipient }) =>
  request("/api/transfers/authorization/verify", {
    method: "POST",
    body: { kind, code, amount, type, recipient },
    quiet401: true,
  });
