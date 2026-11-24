// DEMO ONLY: the password is written in the front-end, so anyone can read it.
// Before launch, replace this with a request to your server (over HTTPS) that checks
// the logged-in user's real password and returns true or false.
const DEMO_PASSWORD = "Adalove1*";

export const verifyPassword = async (password) => {
  await new Promise((resolve) => setTimeout(resolve, 700)); // pretend to wait for the server
  return password === DEMO_PASSWORD;
};