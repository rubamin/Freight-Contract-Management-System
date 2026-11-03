// Builds a case-insensitive, whitespace-trimmed key from the given fields
// of a record, so e.g. "Ahmedabad" and " ahmedabad " are treated as the
// same value when checking for duplicates.
export const buildDuplicateKey = (record, fields) =>
  fields.map((field) => String(record?.[field] ?? "").trim().toUpperCase()).join("|");

// Builds the Set of duplicate keys for a list of already-saved master
// records, for quick lookup against newly entered rows.
export const buildExistingKeySet = (records, fields) =>
  new Set((records || []).map((record) => buildDuplicateKey(record, fields)));
