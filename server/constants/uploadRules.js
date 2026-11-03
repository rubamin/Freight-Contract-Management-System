// Allowed file types and size limits of every upload field - keep in sync
// with client/src/constants/uploadRules.js, which shows them next to each
// upload field.
const MB = 1024 * 1024;

// Storage budget (50 GB disk, at least 300 invoices a month): an invoice
// has up to 3 documents, each at most 1 MB and together at most 2 MB, so
// even the worst case stays at about 600 MB a month (7.2 GB a year).
const INVOICE_DOCUMENT_RULE = {
  extensions: [".pdf", ".jpg", ".jpeg", ".png", ".xls", ".xlsx", ".doc", ".docx"],
  maxSizeMB: 1,
  maxTotalSizeMB: 2,
};

const toBytes = (sizeMB) => sizeMB * MB;

const getExtension = (fileName) => {
  const match = String(fileName || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
};

// Returns an error message for a file that breaks the rule, else null.
const findUploadRuleViolation = (file, rule, fieldLabel) => {
  if (!file) return null;
  if (!rule.extensions.includes(getExtension(file.originalname))) {
    return `${fieldLabel}: '${file.originalname}' is not a supported file type (${rule.extensions.join(", ")}).`;
  }
  if (file.size > toBytes(rule.maxSizeMB)) {
    return `${fieldLabel}: '${file.originalname}' is larger than ${rule.maxSizeMB} MB.`;
  }
  return null;
};

// Returns an error message when the documents of one invoice together
// exceed the rule's total, else null. sizes are in bytes.
const findTotalSizeViolation = (sizes, rule, invoiceLabel) => {
  const totalBytes = sizes.reduce((sum, size) => sum + (Number(size) || 0), 0);
  if (totalBytes <= toBytes(rule.maxTotalSizeMB)) return null;
  return `${invoiceLabel}: supporting documents together are ${(totalBytes / MB).toFixed(2)} MB; the limit is ${rule.maxTotalSizeMB} MB per invoice.`;
};

module.exports = {
  INVOICE_DOCUMENT_RULE,
  findUploadRuleViolation,
  findTotalSizeViolation,
};
