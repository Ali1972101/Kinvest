// Sign-up with an emailed code. The account is only created after the right code is entered.
// Self-contained: it does not depend on any other file in the project.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const post = async (path, body) => {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    const e = new Error("We couldn't reach KinvestBank. Check your connection and try again.");
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
    e.code = data.code;
    throw e;
  }
  return data;
};

// Step 1: send the whole sign-up form. Nothing is created yet; a 6-digit code is emailed.
// -> { email, sentTo: "j•••@gmail.com", expiresInMinutes, resendAfterSeconds }
export const startSignup = (form) => post("/api/auth/signup/start", form);

// Emails a new code for a sign-up that is waiting.
export const resendSignupCode = (email) => post("/api/auth/signup/resend", { email });

// Step 2: the right code creates the account. -> { user }
export const verifySignup = async ({ email, code }) => {
  const res = await post("/api/auth/signup/verify", { email, code });
  return { user: res.user };
};