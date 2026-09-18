// Builds a case-insensitive, whitespace-trimmed key from the given fields
// of a record, so e.g. "Ahmedabad" and " ahmedabad " are treated as the
// same value when checking for duplicates.
export const buildDuplicateKey = (record, fields) =>
  fields.map((field) => String(record?.[field] ?? "").trim().toUpperCase()).join("|");

// Builds the Set of duplicate keys for a list of already-saved master
// records, for quick lookup against newly entered rows.
export const buildExistingKeySet = (records, fields) =>
  new Set((records || []).map((record) => buildDuplicateKey(record, fields)));

// A row counts as a duplicate if its key matches either an existing saved
// record or another row already entered earlier in the same batch.
export const isDuplicateRow = (row, fields, existingKeySet, priorRowKeys) => {
  const key = buildDuplicateKey(row, fields);
  if (!key.replace(/\|/g, "")) return false; // empty/unfilled row - not a duplicate yet
  return existingKeySet.has(key) || priorRowKeys.includes(key);
};