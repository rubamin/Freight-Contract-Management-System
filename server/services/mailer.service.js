const nodemailer = require("nodemailer");
const { DEFAULT_NOTIFICATION_EMAIL } = require("../constants/email");

// Same Gmail/nodemailer transporter configuration already used for invoice
// notification emails (see controllers/invoiceDocumentController.js),
// centralized here so other flows (e.g. password reset) can reuse it.
//
// NOTE: Gmail rejects this login with "Invalid login: 535-5.7.8" unless
// EMAIL_PASS is a 16-character Google App Password (Google Account ->
// Security -> 2-Step Verification -> App passwords), not the normal Gmail
// account password. That mismatch is the most common cause of this email
// silently failing to send.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: DEFAULT_NOTIFICATION_EMAIL,
    pass: process.env.EMAIL_PASS || "",
  },
});

const sendPasswordResetEmail = async (toEmail, resetLink) => {
  if (!process.env.EMAIL_PASS) {
    // Fail fast with a clear message instead of letting nodemailer attempt
    // an auth handshake with an empty password and return an opaque error.
    throw new Error(
      "EMAIL_PASS environment variable is not set; cannot authenticate with the mail provider."
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; background:#f4f7fc; padding:24px;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(15,23,42,0.08);">
        <h2 style="color:#1e3a8a; margin-top:0;">Reset your password</h2>
        <p style="color:#1f2937; font-size:14px; line-height:1.6;">
          We received a request to reset the password for your Freight Contract Management account.
          Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <p style="text-align:center; margin:32px 0;">
          <a href="${resetLink}" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color:#6b7280; font-size:12px; line-height:1.6;">
          If you didn't request this, you can safely ignore this email — your password will remain unchanged.
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <span style="word-break:break-all;">${resetLink}</span>
        </p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: DEFAULT_NOTIFICATION_EMAIL,
    to: toEmail,
    subject: "Reset your password - Freight Contract Management",
    html: htmlContent,
  });
};

module.exports = {
  sendPasswordResetEmail,
};
