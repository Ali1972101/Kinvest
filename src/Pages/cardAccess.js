// Checks the logged-in customer's password. Replace with a request to your server
// (over HTTPS) that checks the real password and returns true or false.
import { verifyCurrentPassword } from "../Components/userStore";

export const verifyPassword = (password) => verifyCurrentPassword(password);