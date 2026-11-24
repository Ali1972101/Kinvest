/*
  Sends email. Pick ONE provider with environment settings:

  1) Brevo (recommended on Render, because it uses HTTPS and not SMTP ports):
       BREVO_API_KEY=...        MAIL_FROM="KinvestBank <you@gmail.com>"
     In Brevo, add and verify that sender address (a Gmail address works).

  2) Resend:   RESEND_API_KEY=...   MAIL_FROM="KinvestBank <alerts@yourdomain.com>"
     (needs a domain you have verified in Resend)

  3) SMTP, for example Gmail on your own computer (npm install nodemailer):
       SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=you@gmail.com
       SMTP_PASS=<a Google "App password">  MAIL_FROM="KinvestBank <you@gmail.com>"
     Render's free plan blocks SMTP, so use Brevo or Resend there.

  With nothing set, and NODE_ENV not "production", the email is printed in the server console
  instead of being sent, so you can test locally. In production it fails instead.
*/

const FROM_NAME = "KinvestBank";

const parseFrom = () => {
  const raw = (process.env.MAIL_FROM || "").trim();
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || FROM_NAME, email: m[2].trim() };
  return { name: FROM_NAME, email: raw };
};

const escapeHtml = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const failed = (provider, status, detail) => {
  // the details stay in the server log. The customer only sees a general message.
  console.error(`Email provider ${provider} failed (${status}):`, String(detail).slice(0, 300));
  const err = new Error("Email could not be sent.");
  err.mailFailed = true;
  return err;
};

// which way email is sent, for the startup message
const mailProvider = () => {
  if (process.env.BREVO_API_KEY) return "Brevo";
  if (process.env.RESEND_API_KEY) return "Resend";
  if (process.env.SMTP_HOST) return "SMTP";
  return null;
};

const sendMail = async ({ to, subject, text, html }) => {
  const from = parseFrom();

  if (process.env.BREVO_API_KEY) {
    if (!from.email) throw new Error("MAIL_FROM is not set.");
    let res;
    try {
      res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: from.name, email: from.email },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
        signal: AbortSignal.timeout(12000),
      });
    } catch (e) {
      throw failed("Brevo", "network", e.message);
    }
    if (!res.ok) throw failed("Brevo", res.status, await res.text().catch(() => ""));
    return;
  }

  if (process.env.RESEND_API_KEY) {
    if (!from.email) throw new Error("MAIL_FROM is not set.");
    let res;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [to], subject, html, text }),
        signal: AbortSignal.timeout(12000),
      });
    } catch (e) {
      throw failed("Resend", "network", e.message);
    }
    if (!res.ok) throw failed("Resend", res.status, await res.text().catch(() => ""));
    return;
  }

  if (process.env.SMTP_HOST) {
    let nodemailer;
    try {
      nodemailer = require("nodemailer"); // only needed for SMTP: npm install nodemailer
    } catch {
      throw failed("SMTP", "setup", "nodemailer is not installed. Run: npm install nodemailer");
    }
    const port = Number(process.env.SMTP_PORT) || 465;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 12000,
      socketTimeout: 12000,
    });
    try {
      await transport.sendMail({ from: `${from.name} <${from.email || process.env.SMTP_USER}>`, to, subject, text, html });
    } catch (e) {
      throw failed("SMTP", e.code || "error", e.message);
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n----- EMAIL (not sent: no email provider set) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------------------\n`);
    return;
  }

  throw failed("none", "setup", "No email provider is set (BREVO_API_KEY, RESEND_API_KEY or SMTP_HOST).");
};

/* ---------- Code emails (one look for every code we send) ---------- */
const moneyText = (cents) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const buildCodeEmail = ({ hello, intro, code, rows, minutes, warning, ignore }) => {
  const text =
    `${hello}\n\n${intro}\n\nYour KinvestBank verification code is: ${code}\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nThe code works for ${minutes} minutes and only once.\n\n${ignore}\n\n` +
    `KinvestBank will never call or message you to ask for this code.\n`;

  const rowHtml = rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:12px 16px;color:#66708a;${i ? "border-top:1px solid #e3e6ec;" : ""}">${escapeHtml(k)}</td>` +
        `<td style="padding:12px 16px;text-align:right;font-weight:600;${i ? "border-top:1px solid #e3e6ec;" : ""}">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f1f3f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f8;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#1a2233;">
<tr><td style="background:#0a1d42;padding:22px 28px;color:#ffffff;font-size:19px;font-weight:600;letter-spacing:0.4px;">KinvestBank</td></tr>
<tr><td style="padding:30px 28px 8px;">
<p style="margin:0 0 14px;font-size:16px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.55;">${escapeHtml(intro)}</p>
<p style="margin:0 0 22px;text-align:center;">
<span style="display:inline-block;padding:14px 26px;border-radius:10px;background:#eef2fa;font-size:34px;font-weight:700;letter-spacing:9px;color:#0a1d42;font-family:Consolas,Menlo,monospace;">${escapeHtml(code)}</span>
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e3e6ec;border-radius:10px;font-size:14.5px;">
${rowHtml}
<tr><td style="padding:12px 16px;color:#66708a;border-top:1px solid #e3e6ec;">Valid for</td><td style="padding:12px 16px;text-align:right;font-weight:600;border-top:1px solid #e3e6ec;">${minutes} minutes, one use</td></tr>
</table>
<p style="margin:0 0 20px;padding:12px 14px;border-left:4px solid #b88a2a;background:#fbf6e8;font-size:14px;line-height:1.55;color:#5a4a18;">
<strong>Never share this code.</strong> ${escapeHtml(warning)}
</p>
<p style="margin:0 0 26px;font-size:14px;line-height:1.55;color:#4a5468;">${escapeHtml(ignore)}</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #e3e6ec;font-size:12px;color:#7b8497;">This is an automated message. Please do not reply to it.</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { text, html };
};

const WARNING = "KinvestBank will never call, text or email you to ask for it.";

/* ---------- The transfer code email ---------- */
const sendTransferCodeEmail = async ({ to, firstName, code, amountCents, type, recipient, minutes }) => {
  const kind = type === "international" ? "international" : "domestic";
  const { text, html } = buildCodeEmail({
    hello: firstName ? `Hi ${firstName},` : "Hello,",
    intro: "Use this code to confirm your transfer.",
    code,
    rows: [
      ["Transfer", `${moneyText(amountCents)} (${kind})`],
      ["To", recipient],
    ],
    minutes,
    warning: WARNING,
    ignore: "Didn't ask for this? Someone may be trying to use your account. Please change your password and contact support.",
  });
  await sendMail({ to, subject: `${code} is your KinvestBank verification code`, text, html });
};

/* ---------- The sign-up code email ---------- */
const sendSignupCodeEmail = async ({ to, firstName, code, accountType, minutes }) => {
  const { text, html } = buildCodeEmail({
    hello: firstName ? `Hi ${firstName},` : "Hello,",
    intro: "Welcome to KinvestBank. Enter this code to confirm your email address and open your account.",
    code,
    rows: [
      ["Email", to],
      ["Account", accountType],
    ],
    minutes,
    warning: WARNING,
    ignore: "Didn't try to open an account? You can ignore this email. No account will be created without the code.",
  });
  await sendMail({ to, subject: `${code} is your KinvestBank sign-up code`, text, html });
};

module.exports = { sendMail, mailProvider, parseFrom, sendTransferCodeEmail, sendSignupCodeEmail };