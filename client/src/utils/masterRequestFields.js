import {
  HIDDEN_REQUEST_FIELDS,
  MASTER_ACTIONS,
  MAX_REQUEST_VALUE_LENGTH,
} from "../constants/masterApproval";

const EMPTY_VALUE = "-";

// "ContractStartDate" / "vendorPan" -> "Contract Start Date" / "Vendor Pan".
export const prettifyFieldName = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());

const describeArrayItem = (item) => {
  if (item && typeof item === "object") {
    return item.GSTNumber || item.Name || item.name || item.label || JSON.stringify(item);
  }
  return String(item);
};

const looksLikeJson = (text) => /^[[{]/.test(text.trim());

// Display text of one request value; long or structured data is summarised.
export const formatRequestValue = (value) => {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(describeArrayItem).join(", ") : EMPTY_VALUE;
  if (typeof value === "object") return JSON.stringify(value);

  const text = String(value);
  if (text.length > MAX_REQUEST_VALUE_LENGTH) {
    return looksLikeJson(text) ? "Detailed data (rate sheets) updated" : `${text.slice(0, MAX_REQUEST_VALUE_LENGTH)}...`;
  }
  return text;
};

const isShownField = (key) => !HIDDEN_REQUEST_FIELDS.includes(key);

/**
 * Rows of the request details table.
 * Add: [{ field, proposed }] of every filled field.
 * Edit: [{ field, current, proposed, changed }], changed fields first.
 */
export const buildChangeRows = (actionType, payload, oldData) => {
  const keys = Object.keys(payload || {}).filter(isShownField);

  if (actionType !== MASTER_ACTIONS.EDIT) {
    return keys
      .map((key) => ({ key, field: prettifyFieldName(key), proposed: formatRequestValue(payload[key]) }))
      .filter((row) => row.proposed !== EMPTY_VALUE);
  }

  return keys
    .map((key) => {
      const current = formatRequestValue(oldData?.[key]);
      const proposed = formatRequestValue(payload[key]);
      return { key, field: prettifyFieldName(key), current, proposed, changed: current !== proposed };
    })
    .sort((a, b) => Number(b.changed) - Number(a.changed));
};

// Column keys of a bulk upload preview (every header found in the rows).
export const getBulkColumns = (rows) => [...new Set((rows || []).flatMap((row) => Object.keys(row || {})))];
