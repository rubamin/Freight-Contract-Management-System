import dayjs from 'dayjs';

// Format the app displays dates in (UI only).
export const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY';

// Format the API/DB expects (matches the DATEONLY column, e.g. InvoiceDate/LRDate).
const API_DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Formats a stored date value (YYYY-MM-DD string, ISO string, Date, or dayjs)
 * for display as DD/MM/YYYY. Never changes what is actually stored/sent —
 * display only.
 *
 * @param {string|Date|import('dayjs').Dayjs|null|undefined} date
 * @returns {string} Formatted date, or '-' if the input is empty/invalid.
 */
export const formatDateDisplay = (date) => {
  if (!date) return '-';
  const parsedDate = dayjs(date);
  return parsedDate.isValid() ? parsedDate.format(DISPLAY_DATE_FORMAT) : '-';
};

/**
 * Converts a dayjs value (as produced by a DatePicker) into the YYYY-MM-DD
 * string expected by the API/DB for DATEONLY columns.
 *
 * @param {import('dayjs').Dayjs|null|undefined} dayjsValue
 * @returns {string|null} YYYY-MM-DD string, or null if empty/invalid.
 */
export const parseDateForApi = (dayjsValue) => {
  if (!dayjsValue) return null;
  const parsedDate = dayjs(dayjsValue);
  return parsedDate.isValid() ? parsedDate.format(API_DATE_FORMAT) : null;
};

/**
 * Converts a stored YYYY-MM-DD string (or ISO string/Date) into a dayjs
 * instance suitable for a DatePicker's `value` prop.
 *
 * @param {string|Date|null|undefined} date
 * @returns {import('dayjs').Dayjs|null}
 */
export const toDayjsValue = (date) => {
  if (!date) return null;
  const parsedDate = dayjs(date);
  return parsedDate.isValid() ? parsedDate : null;
};
