// Saved Add Invoice / Edit Invoice drafts. Attachments are stored outside
// the public /uploads folder so they are only reachable through the
// authorized draft file route.
const path = require("path");
const { INVOICE_DOCUMENT_RULE } = require("./uploadRules");

const DRAFT_UPLOADS_DIR = path.join(__dirname, "../draft_uploads");
const MAX_DRAFT_TITLE_LENGTH = 200;
// Draft attachments become invoice documents, so they follow the same limit.
const MAX_DRAFT_FILE_SIZE_MB = INVOICE_DOCUMENT_RULE.maxSizeMB;
// Multipart field name of a draft attachment: file_<key>.
const DRAFT_FILE_FIELD_PREFIX = "file_";
// Keys become file names on disk, so only safe characters are accepted.
const DRAFT_FILE_KEY_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

// ADD: a saved Add Invoice page. EDIT: unsaved changes of existing
// invoices - nothing is audited or sent for approval until they are saved.
const DRAFT_TYPES = {
  ADD: "ADD",
  EDIT: "EDIT",
};

const MAX_SHARE_COMMENT_LENGTH = 1000;

module.exports = {
  DRAFT_UPLOADS_DIR,
  MAX_DRAFT_TITLE_LENGTH,
  MAX_DRAFT_FILE_SIZE_MB,
  DRAFT_FILE_FIELD_PREFIX,
  DRAFT_FILE_KEY_PATTERN,
  DRAFT_TYPES,
  MAX_SHARE_COMMENT_LENGTH,
};
