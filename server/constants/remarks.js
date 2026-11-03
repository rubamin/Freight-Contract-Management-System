// Every business module carries two remark columns:
//   UserRemarks - "Remark by User", typed and edited by the user.
//   Remarks     - system generated (audit outcome, created / updated by),
//                 never accepted from a request body.
const REMARK_MAX_LENGTH = 1000;

const SYSTEM_REMARKS_FIELD = "Remarks";

// Separates the "created" part of a system remark from the latest
// "updated" part, so each update replaces only the latter.
const SYSTEM_REMARK_SEPARATOR = " | ";
const UPDATED_REMARK_PREFIX = "Last updated by";

module.exports = {
  REMARK_MAX_LENGTH,
  SYSTEM_REMARKS_FIELD,
  SYSTEM_REMARK_SEPARATOR,
  UPDATED_REMARK_PREFIX,
};
