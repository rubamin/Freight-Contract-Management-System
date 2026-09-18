import api from "./api";

// Streams back an .xlsx file, so this must be requested as a blob rather
// than the default JSON response type.
export const exportInvoicesExcel = (params) =>
  api.get("/reports/invoices/export", { params, responseType: "blob" });
