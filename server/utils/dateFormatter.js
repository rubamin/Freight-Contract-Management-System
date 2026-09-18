// Formats a DATEONLY/DATE value for display in exported documents
// (DD/MM/YYYY, matching the frontend's display convention). Returns "-"
// for null/invalid values instead of throwing, since export documents
// should never fail to render just because a date field is empty.
const formatDateForDisplay = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// Bug fix (task item 12): "Conversion failed when converting date and/or
// time from character string." Normalizes any date value the API receives
// (an ISO YYYY-MM-DD string, a full ISO datetime, a locale string like
// DD/MM/YYYY, or something malformed/empty) into a strict YYYY-MM-DD
// string before it ever reaches a Sequelize insert/update, or returns null
// if it truly can't be parsed - so a bad string never reaches SQL Server's
// date conversion. This is the server-side half of the fix; the
// corresponding frontend normalization lives in
// client/src/utils/dateFormat.js.
const normalizeDateForDb = (value) => {
  if (!value) return null;

  // Already a clean YYYY-MM-DD string - fast path, no reparsing needed.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Try DD/MM/YYYY (the app's display format) explicitly before falling
  // back to the native Date parser, since `new Date("24/08/2026")` is
  // ambiguous/unreliable across locales and can silently produce the
  // wrong date instead of failing loudly.
  const ddmmyyyyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

module.exports = { formatDateForDisplay, normalizeDateForDb };
