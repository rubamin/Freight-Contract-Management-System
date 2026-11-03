// Allowed file types and size limit of every upload field. The server
// enforces the same values (server/constants/uploadRules.js for invoice
// documents, server/middleware/uploadMiddelware.js for the others).
const MB = 1024 * 1024;

// maxTotalSizeMB: limit of all files of one record together (optional).
const rule = (extensions, maxSizeMB, mimeTypes = [], maxTotalSizeMB = null) => ({
  extensions,
  maxSizeMB,
  maxTotalSizeMB,
  mimeTypes,
  accept: extensions.join(","),
  label: extensions.map((extension) => extension.replace(".", "").toUpperCase()).join(", "),
});

export const UPLOAD_RULES = {
  // 1 MB a file and 2 MB per invoice keep the 50 GB disk within budget at
  // 300+ invoices a month; photos are compressed in the browser first
  // (utils/compressImage.js).
  INVOICE_DOCUMENT: rule([".pdf", ".jpg", ".jpeg", ".png", ".xls", ".xlsx", ".doc", ".docx"], 1, [], 2),
  CONTRACT_RATE_MATRIX: rule([".xls", ".xlsx"], 20),
  BULK_UPLOAD: rule([".xlsx", ".xls", ".csv"], 10),
  PROFILE_PHOTO: rule([".jpg", ".jpeg", ".png", ".webp"], 2),
};

const getExtension = (fileName) => {
  const match = String(fileName || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
};

// Returns an error message for a file that breaks the rule, else null.
export const findUploadRuleViolation = (file, uploadRule) => {
  if (!file) return null;
  if (!uploadRule.extensions.includes(getExtension(file.name))) {
    return `'${file.name}' is not supported. Allowed: ${uploadRule.label}.`;
  }
  if (file.size > uploadRule.maxSizeMB * MB) {
    return `'${file.name}' is larger than ${uploadRule.maxSizeMB} MB.`;
  }
  return null;
};

// Returns an error message when files of one record together exceed the
// rule's total, else null. sizes are in bytes.
export const findTotalSizeViolation = (sizes, uploadRule) => {
  if (!uploadRule.maxTotalSizeMB) return null;
  const totalBytes = sizes.reduce((sum, size) => sum + (Number(size) || 0), 0);
  if (totalBytes <= uploadRule.maxTotalSizeMB * MB) return null;
  return `Documents of one invoice together can be at most ${uploadRule.maxTotalSizeMB} MB (now ${(totalBytes / MB).toFixed(2)} MB).`;
};
