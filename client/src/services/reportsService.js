import api from "./api";

const unwrap = (response) => response.data?.data;

// Reports the logged-in user can open.
export const getReportCatalog = () => api.get("/reports/catalog").then(unwrap);

// Columns, summary cards and rows of one report. Large reports can take a
// while, so this call gets a longer timeout than the API default.
export const getReportData = (reportKey) =>
  api.get(`/reports/data/${reportKey}`, { timeout: 120000 }).then(unwrap);
