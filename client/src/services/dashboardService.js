import api from "./api";

// params: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }
export const getDashboardSummary = (params) => api.get("/dashboard/summary", { params });
