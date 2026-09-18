import api from "./api";

// params: { since?: ISO timestamp string }
export const getRecentNotifications = (params) => api.get("/notifications", { params });
