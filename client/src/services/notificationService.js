import api from "./api";

// params: { scope?: "mine" | "all" } - "all" is honoured for admins only.
export const getRecentNotifications = (params) => api.get("/notifications", { params });

export const deleteNotification = (notificationId) => api.delete(`/notifications/${notificationId}`);

export const clearNotifications = () => api.delete("/notifications");
