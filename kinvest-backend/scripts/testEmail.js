// Sends one test email so you can check your email settings.
//   npm run test-email you@gmail.com
require("dotenv").config();

const { sendMail, mailProvider, parseFrom } = require("../utils/mailer");

const to = (process.argv[2] || "").trim();
if (!/^\S+@\S+\.\S+$/.test(to)) {
  console.error("Usage: npm run test-email you@example.com");
  process.exit(1);
}

const provider = mailProvider();
if (!provider) {
  console.error("No email provider is set. Add BREVO_API_KEY and MAIL_FROM to your .env file.");
  process.exit(1);
}

console.log(`Sending a test email with ${provider} from ${parseFrom().email} to ${to} ...`);

sendMail({
  to,
  subject: "KinvestBank email test",
  text: "If you can read this, KinvestBank can send email. Sign-up and transfer codes will arrive.",
  html: "<p style=\"font-family:Arial,sans-serif;font-size:16px\">If you can read this, <strong>KinvestBank</strong> can send email. Sign-up and transfer codes will arrive.</p>",
})
  .then(() => {
    console.log("Sent. Check the inbox (and the spam folder).");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Could not send:", err.message);
    console.error("Look just above this line for the reason from the email service.");
    console.error("Common reasons: the sender address is not verified in Brevo yet, the API key is wrong, or the phone check in Brevo is not finished.");
    process.exit(1);
  });