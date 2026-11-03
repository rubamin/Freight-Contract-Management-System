const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { sendMail } = require("./mailer.service");
const { CLIENT_URL } = require("../constants/email");
const logger = require("../utils/logger");

const MASTER_APPROVALS_PATH = "/master-approvals";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getEmails = async (userIds) => {
  const ids = [...new Set(userIds.filter((id) => id != null).map(Number))];
  if (!ids.length) return [];
  const users = await sequelize.query(
    "SELECT Email FROM Users WHERE UserID IN (:ids) AND IsActive = 1 AND Email IS NOT NULL",
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
  return users.map(({ Email }) => Email);
};

const buildHtml = ({ heading, intro, rows }) => `
  <div style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;">
    <h3 style="color:#1a365d;margin-bottom:8px;">${escapeHtml(heading)}</h3>
    <p>${intro}</p>
    <table style="border-collapse:collapse;font-size:12px;">
      ${rows.map(([label, value]) => `
      <tr>
        <td style="border:1px solid #ddd;padding:6px 10px;background:#f8fafc;font-weight:bold;">${escapeHtml(label)}</td>
        <td style="border:1px solid #ddd;padding:6px 10px;">${escapeHtml(value)}</td>
      </tr>`).join("")}
    </table>
    <p style="margin-top:16px;">
      <a href="${CLIENT_URL}${MASTER_APPROVALS_PATH}" style="background:#2563eb;color:#fff;text-decoration:none;padding:8px 18px;border-radius:6px;display:inline-block;">Open Master Approvals</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;">Freight Contract Management System Automation</p>
  </div>`;

// Mails one master change request notice. Never throws: the request is
// already saved, and the in-app notification still reaches the user.
const sendMasterRequestMail = async ({ userIds, subject, heading, intro, rows }) => {
  try {
    const to = await getEmails(userIds);
    if (!to.length) return;
    await sendMail({ to: to.join(","), subject, html: buildHtml({ heading, intro, rows }) });
  } catch (error) {
    logger.error("Master approval mail failed.", { subject, message: error.message });
  }
};

module.exports = { sendMasterRequestMail, escapeHtml };
