// Talks to the Kinqora backend for account recovery.
// Uses the same VITE_API_URL setting as the rest of the website.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const post = async (path, body) => {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    const e = new Error("We couldn't reach Kinqora. Check your connection and try again.");
    e.network = true;
    throw e;
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* the server sent no JSON */
  }

  if (!res.ok) {
    const e = new Error(data.message || "Something went wrong. Please try again.");
    e.status = res.status;
    throw e;
  }
  return data;
};

// step 1: { account: last 6 digits, taxId: 9 digits } -> { recoveryToken, userId, firstName }
export const verifyRecovery = ({ account, taxId }) => post("/auth/recover/verify", { account, taxId });

// step 2: choose the new password
export const resetPassword = ({ recoveryToken, newPassword }) =>
  post("/auth/recover/reset", { recoveryToken, newPassword });
