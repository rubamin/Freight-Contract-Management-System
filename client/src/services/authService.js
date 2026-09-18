import api from "./api";

export const login = (credentials) => api.post("/auth/login", credentials);

export const getProfile = () => api.get("/auth/me");

export const forgotPassword = (payload) => api.post("/auth/forgot-password", payload);

export const resetPassword = (payload) => api.post("/auth/reset-password", payload);
