// Account and password emails: new account details, admin password
// reset, forgot-password code and the "password changed" notice. Branded
// with the company red line, and every one carries a plain-text version.
const { sendMail } = require("./mailer.service");
const { CLIENT_URL } = require("../constants/email");
const { OTP_VALID_MINUTES } = require("../constants/password");

const COMPANY_RED = "#c8102e";
const BRAND_NAME = "Freight Contract Management System";
const SUBJECT_PREFIX = "Freight Contract";
const SIGN_IN_URL = `${CLIENT_URL}/login`;

// Thrown when an account email could not be delivered.
class EmailDeliveryError extends Error {}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const paragraphHtml = (text) => `<p style="margin:0 0 12px;">${escapeHtml(text)}</p>`;

const detailsHtml = (details) => {
  const rows = details.map(([label, value]) => (
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${escapeHtml(label)}</td>` +
    `<td style="padding:4px 0;font-family:Consolas,Menlo,monospace;font-size:15px;font-weight:600;">${escapeHtml(value)}</td></tr>`
  )).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;padding:12px 16px;background:#f8fafc;border:1px solid #e5e7f0;border-radius:8px;">${rows}</table>`;
};

const signInButtonHtml = () => (
  `<p style="margin:20px 0 0;"><a href="${escapeHtml(SIGN_IN_URL)}" style="background:${COMPANY_RED};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;display:inline-block;font-weight:600;">Sign in</a></p>`
);

const wrapHtml = (heading, innerHtml) => `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7f0;border-top:4px solid ${COMPANY_RED};border-radius:10px;padding:28px;color:#1f2937;font-size:14px;line-height:1.6;">
      <h2 style="margin:0 0 16px;font-size:19px;color:#1f2937;">${escapeHtml(heading)}</h2>
      ${innerHtml}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin:16px 0 0;">
      ${escapeHtml(BRAND_NAME)} - automated message, please do not reply.
    </p>
  </body>
</html>`;

// Builds the HTML and plain-text versions from the same parts.
// `before` / `after` are plain-text paragraphs around the details box.
const buildMessage = ({ heading, before, details = [], after = [], withSignIn }) => {
  const innerHtml = before.map(paragraphHtml).join("") +
    (details.length ? detailsHtml(details) : "") +
    after.map(paragraphHtml).join("") +
    (withSignIn ? signInButtonHtml() : "");
  const text = [
    ...before,
    ...details.map(([label, value]) => `${label}: ${value}`),
    ...after,
    ...(withSignIn ? [`Sign in: ${SIGN_IN_URL}`] : []),
  ].join("\n\n");

  return { html: wrapHtml(heading, innerHtml), text };
};

const deliver = async (to, subject, message) => {
  try {
    await sendMail({ to, subject: `${SUBJECT_PREFIX} - ${subject}`, ...message });
  } catch (error) {
    throw new EmailDeliveryError(error.message);
  }
};

const greeting = (name) => `Hi ${name || "there"},`;

const FIRST_SIGN_IN_NOTE =
  "When you sign in with this temporary password you will be asked to set your own password before you can continue.";

const sendNewAccountEmail = ({ name, email, tempPassword }) =>
  deliver(email, "Your account details", buildMessage({
    heading: "Your Freight Contract account",
    before: [greeting(name), "An account has been created for you on the Freight Contract Management System. Your sign-in details are:"],
    details: [["Login ID", email], ["Temporary password", tempPassword]],
    after: [FIRST_SIGN_IN_NOTE],
    withSignIn: true,
  }));

const sendAdminResetEmail = ({ name, email, tempPassword }) =>
  deliver(email, "Your password was reset", buildMessage({
    heading: "Your password was reset",
    before: [greeting(name), "An administrator has reset your password. Your old password no longer works. Your new sign-in details are:"],
    details: [["Login ID", email], ["Temporary password", tempPassword]],
    after: [FIRST_SIGN_IN_NOTE],
    withSignIn: true,
  }));

const sendPasswordOtpEmail = ({ name, email, code }) =>
  deliver(email, "Your password reset code", buildMessage({
    heading: "Your password reset code",
    before: [greeting(name), "Use this code on the \"Forgot password\" page to set a new password:"],
    details: [["Code", code]],
    after: [
      `The code is valid for ${OTP_VALID_MINUTES} minutes and can be used once.`,
      "If you did not ask for this, ignore this email. Your password stays the same.",
    ],
    withSignIn: false,
  }));

const sendPasswordChangedEmail = ({ name, email }) =>
  deliver(email, "Your password was changed", buildMessage({
    heading: "Your password was changed",
    before: [greeting(name), "The password for your Freight Contract account was just changed."],
    after: ["If this was not you, use \"Forgot password\" on the sign-in page straight away or contact your administrator."],
    withSignIn: true,
  }));

module.exports = {
  EmailDeliveryError,
  sendNewAccountEmail,
  sendAdminResetEmail,
  sendPasswordOtpEmail,
  sendPasswordChangedEmail,
};
