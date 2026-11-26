const express = require("express");
const rateLimit = require("express-rate-limit");

const { HttpError } = require("../utils/errors");
const { str, cleanName, cleanEmail, cleanPhone } = require("../utils/validate");
const { sendMail, escapeHtml } = require("../utils/mailer");

const router = express.Router();

// where the messages go. Set SUPPORT_EMAIL on Render to change it.
const supportEmail = () => (process.env.SUPPORT_EMAIL || "support@kinqora.com").trim();

// a person can only send a few messages an hour, so the form can't be used to flood the inbox
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "You've sent several messages already. Please try again later." },
});

// POST /api/contact  (public, no login needed)
router.post("/", limiter, async (req, res, next) => {
  try {
    const body = req.body || {};

    // spam trap: real people leave this empty. Pretend it worked and send nothing.
    if (str(body.website)) return res.json({ ok: true });

    const firstName = cleanName(body.firstName, "first name");
    const lastName = cleanName(body.lastName, "last name");
    const email = cleanEmail(body.email);
    const phone = cleanPhone(body.phone);
    const comments = str(body.comments);
    if (comments.length < 5) throw new HttpError(400, "Tell us how we can help.");
    if (comments.length > 1000) throw new HttpError(400, "Your message is too long.");

    const name = `${firstName} ${lastName}`;
    const when = new Date().toUTCString();
    // no line breaks in the subject, so nobody can inject extra email headers
    const subject = `Contact form: ${name}`.replace(/[\r\n]+/g, " ").slice(0, 120);

    const text =
      `New message from the Kinqora Contact Us form\n\n` +
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nSent: ${when}\n\n` +
      `Message:\n${comments}\n\n` +
      `Reply to this email to answer ${firstName} directly.\n`;

    const row = (k, v) =>
      `<tr><td style="padding:10px 14px;color:#66708a;width:90px;">${k}</td><td style="padding:10px 14px;font-weight:600;">${escapeHtml(v)}</td></tr>`;

    const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f1f3f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#1a2233;">
<tr><td style="background:#0a1d42;padding:20px 26px;color:#ffffff;font-size:18px;font-weight:600;">Kinqora · New contact message</td></tr>
<tr><td style="padding:22px 26px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e6ec;border-radius:10px;font-size:14.5px;">
${row("Name", name)}
${row("Email", email)}
${row("Phone", phone)}
${row("Sent", when)}
</table>
<p style="margin:20px 0 6px;font-size:13px;color:#66708a;text-transform:uppercase;letter-spacing:0.6px;">Message</p>
<p style="margin:0 0 22px;font-size:15.5px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(comments)}</p>
</td></tr>
<tr><td style="padding:14px 26px 20px;border-top:1px solid #e3e6ec;font-size:12px;color:#7b8497;">Reply to this email to answer ${escapeHtml(firstName)} directly.</td></tr>
</table>
</td></tr></table>
</body></html>`;

    try {
      await sendMail({ to: supportEmail(), subject, text, html, replyTo: email });
    } catch (e) {
      // the details are already in the server log (see mailer.js)
      console.error("Contact form email failed:", e.message);
      throw new HttpError(503, "We couldn't send your message right now. Please try again, or email support@kinqora.com.");
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
