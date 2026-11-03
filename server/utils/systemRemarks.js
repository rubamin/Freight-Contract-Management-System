const {
  REMARK_MAX_LENGTH,
  SYSTEM_REMARK_SEPARATOR,
  UPDATED_REMARK_PREFIX,
} = require("../constants/remarks");

const formatTimestamp = (date = new Date()) =>
  date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const describeUser = (user) => user?.Email || (user?.UserID ? `User #${user.UserID}` : "system");

const limitLength = (text) => text.slice(0, REMARK_MAX_LENGTH);

// "Created by a@b.com on 14 Oct 2026, 10:30" (+ optional detail).
const buildCreatedRemark = (user, detail = "") =>
  limitLength([`Created by ${describeUser(user)} on ${formatTimestamp()}`, detail].filter(Boolean).join(". "));

// Keeps the "created" part of the previous remark and replaces any
// earlier "Last updated by" part with the current one.
const buildUpdatedRemark = (previousRemark, user, detail = "") => {
  const createdPart = String(previousRemark || "")
    .split(SYSTEM_REMARK_SEPARATOR)
    .filter((part) => part && !part.startsWith(UPDATED_REMARK_PREFIX))
    .join(SYSTEM_REMARK_SEPARATOR);
  const updatedPart = [`${UPDATED_REMARK_PREFIX} ${describeUser(user)} on ${formatTimestamp()}`, detail]
    .filter(Boolean)
    .join(". ");
  return limitLength([createdPart, updatedPart].filter(Boolean).join(SYSTEM_REMARK_SEPARATOR));
};

// Trims the user's own remark; blank becomes null.
const normalizeUserRemark = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? limitLength(trimmed) : null;
};

module.exports = { buildCreatedRemark, buildUpdatedRemark, normalizeUserRemark };
