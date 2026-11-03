const fs = require("fs");
const path = require("path");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { sendMail } = require("./mailer.service");
const { CLIENT_URL } = require("../constants/email");

// Kinds of workflow mails. A workflow action only collects notices; they
// are delivered after the transaction commits, so a mail is never sent
// for a change that was rolled back.
const NOTICE_KINDS = {
  UPLOADER_SUBMITTED: "UPLOADER_SUBMITTED",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  FOR_INFORMATION: "FOR_INFORMATION",
  FINAL_APPROVED: "FINAL_APPROVED",
  REJECTED: "REJECTED",
  REMINDER: "REMINDER",
  SUMMARY: "SUMMARY",
};

// Uploader mails go out first: the user who entered the data hears about
// the discrepancy before the approver does.
const KIND_ORDER = Object.values(NOTICE_KINDS);

const APPROVALS_PATH = "/approvals";
const INVOICES_PATH = "/invoices";
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

const AUDIT_LABELS = {
  PRE_APPROVED: "Pre-Approved",
  APPROVED: "Approved",
  DISCREPANCY: "Discrepancy",
};

const escapeHtml = (value) =>
  String(value ?? "-").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const formatMoney = (value) => `&#8377; ${(Number.parseFloat(value) || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toISOString().slice(0, 10);
};

const describeKind = (notice) => {
  const step = escapeHtml(notice.stepName);
  const actor = escapeHtml(notice.actorName);
  switch (notice.kind) {
    case NOTICE_KINDS.UPLOADER_SUBMITTED:
      return {
        subject: "Invoice discrepancy - sent for approval",
        intro: notice.sentTo
          ? `The audit found a discrepancy on the invoice(s) you entered. They have been sent to <strong>${escapeHtml(notice.sentTo)}</strong> (${step}) for approval.`
          : "The audit found a discrepancy on the invoice(s) you entered, but no approval workflow is configured for this location. Please contact the administrator.",
        linkPath: INVOICES_PATH,
      };
    case NOTICE_KINDS.ACTION_REQUIRED:
      return {
        subject: `Action required: invoice approval (${notice.stepName})`,
        intro: `The invoice(s) below are waiting for your approval at step <strong>${step}</strong>.`,
        linkPath: APPROVALS_PATH,
      };
    case NOTICE_KINDS.FOR_INFORMATION:
      return {
        subject: `Invoice shared with you (${notice.stepName})`,
        intro: notice.actorName
          ? `The invoice(s) below were approved by <strong>${actor}</strong> and are shared with you (${step}) for further processing.`
          : `The invoice(s) below are shared with you (${step}) for further processing.`,
        linkPath: INVOICES_PATH,
      };
    case NOTICE_KINDS.FINAL_APPROVED:
      return {
        subject: "Invoice approved",
        intro: `Your invoice(s) below have been approved by <strong>${actor}</strong>.`,
        linkPath: INVOICES_PATH,
      };
    case NOTICE_KINDS.REJECTED:
      return {
        subject: "Invoice rejected",
        intro: `Your invoice(s) below were rejected by <strong>${actor}</strong> at step <strong>${step}</strong>.<br>Reason: <em>${escapeHtml(notice.remarks)}</em><br>Edit and save the invoice to send it for approval again.`,
        linkPath: INVOICES_PATH,
      };
    case NOTICE_KINDS.REMINDER:
      return {
        subject: `Reminder: invoice approval pending (${notice.stepName})`,
        intro: `Reminder from <strong>${actor}</strong>: the invoice(s) below are still waiting for your approval at step <strong>${step}</strong>.`,
        linkPath: APPROVALS_PATH,
      };
    default:
      return {
        subject: "Selected invoices summary",
        intro: `Summary of the selected invoices, sent by <strong>${actor}</strong>.`,
        linkPath: INVOICES_PATH,
      };
  }
};

const buildRowsHtml = (invoices) => invoices.map((invoice, index) => `
  <tr>
    <td style="border:1px solid #ddd;padding:6px;">${index + 1}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(invoice.InvoiceNumber)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${formatDate(invoice.InvoiceDate)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(invoice.VendorName)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(invoice.LocationName)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(invoice.FromStation)} &rarr; ${escapeHtml(invoice.ToStation)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(invoice.LRNumber)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${formatMoney(invoice.TotalInvoiceAmount)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${formatMoney(invoice.ExpectedAmount)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(AUDIT_LABELS[invoice.VerificationStatus] || invoice.VerificationStatus)}</td>
    <td style="border:1px solid #ddd;padding:6px;">${escapeHtml(invoice.Remarks)}</td>
  </tr>`).join("");

const HEADER_CELLS = ["#", "Invoice No", "Invoice Date", "Vendor", "Location", "Route", "LR No", "Billed Amount", "Contract Price", "Audit", "System Remarks"];

const buildHtml = ({ intro, linkPath }, invoices) => `
  <div style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;">
    <h3 style="color:#1a365d;margin-bottom:8px;">Freight Invoice Approval</h3>
    <p>${intro}</p>
    <table style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead>
        <tr style="background:#f2f2f2;">
          ${HEADER_CELLS.map((cell) => `<th style="border:1px solid #ddd;padding:6px;text-align:left;">${cell}</th>`).join("")}
        </tr>
      </thead>
      <tbody>${buildRowsHtml(invoices)}</tbody>
    </table>
    <p style="margin-top:16px;">
      <a href="${CLIENT_URL}${linkPath}" style="background:#2563eb;color:#fff;text-decoration:none;padding:8px 18px;border-radius:6px;display:inline-block;">Open in Freight Contract</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;">Freight Contract Management System Automation</p>
  </div>`;

// Stored invoice documents (uploads/<file>) attached to the mail, limited
// to the uploads directory.
const collectAttachments = (invoices) => {
  const seen = new Set();
  return invoices
    .flatMap((invoice) => [invoice.Doc1Path, invoice.Doc2Path, invoice.Doc3Path])
    .filter(Boolean)
    .map((docPath) => {
      const fileName = String(docPath).replace(/\\/g, "/").split("/").pop();
      const absolutePath = path.resolve(UPLOADS_DIR, fileName);
      if (seen.has(absolutePath) || !absolutePath.startsWith(`${UPLOADS_DIR}${path.sep}`) || !fs.existsSync(absolutePath)) {
        return null;
      }
      seen.add(absolutePath);
      return { filename: fileName, path: absolutePath };
    })
    .filter(Boolean);
};

const getRecipientEmails = async (userIds) => {
  const ids = [...new Set(userIds.filter((id) => id != null).map(Number))];
  if (!ids.length) return new Map();
  const users = await sequelize.query(
    "SELECT UserID, Email FROM Users WHERE UserID IN (:ids) AND Email IS NOT NULL",
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
  return new Map(users.map((user) => [Number(user.UserID), user.Email]));
};

const groupKey = (notice) => [
  notice.kind,
  notice.stepName || "",
  notice.actorName || "",
  notice.remarks || "",
  notice.sentTo || "",
  [...new Set(notice.recipientUserIds.map(Number))].sort().join(","),
].join("|");

// One mail per kind + recipients, listing every invoice of that group, so
// an invoice with several trips (one row each) is not mailed row by row.
const groupNotices = (notices) => {
  const groups = new Map();
  notices
    .filter((notice) => notice.recipientUserIds.length)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    .forEach((notice) => {
      const key = groupKey(notice);
      const group = groups.get(key) || { notice, invoices: [] };
      group.invoices.push(notice.invoice);
      groups.set(key, group);
    });
  return [...groups.values()];
};

// Sends every collected notice. Never throws: the workflow change is
// already committed, so failures are returned for the caller to report.
const deliverNotices = async (notices) => {
  const failures = [];
  if (!notices.length) return { failures };

  const emails = await getRecipientEmails(notices.flatMap((notice) => notice.recipientUserIds));
  for (const { notice, invoices } of groupNotices(notices)) {
    const to = [...new Set(notice.recipientUserIds.map((id) => emails.get(Number(id))).filter(Boolean))];
    if (!to.length) continue;
    const description = describeKind(notice);
    try {
      await sendMail({
        to: to.join(","),
        subject: `${description.subject} - ${invoices.map((invoice) => invoice.InvoiceNumber).filter(Boolean).slice(0, 3).join(", ")}${invoices.length > 3 ? ` +${invoices.length - 3}` : ""}`,
        html: buildHtml(description, invoices),
        attachments: collectAttachments(invoices),
      });
    } catch (error) {
      console.error("Workflow mail failed:", error);
      failures.push(`${description.subject} to ${to.join(", ")}: ${error.message}`);
    }
  }
  return { failures };
};

// Mail failures do not undo a committed workflow change; they are added to
// the API response so the user knows a mail did not go out.
const withMailWarnings = (message, failures) =>
  failures.length ? `${message} Some emails could not be sent: ${failures.join("; ")}` : message;

module.exports = {
  NOTICE_KINDS,
  deliverNotices,
  withMailWarnings,
  escapeHtml,
};
