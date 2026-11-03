import api from "./api";
import { EMAIL_REQUEST_TIMEOUT_MS } from "../constants/password";

export const login = (credentials) => api.post("/auth/login", credentials);

export const getProfile = () => api.get("/auth/me");

export const setPassword = (payload) => api.post("/auth/set-password", payload);

export const forgotPassword = (payload) =>
  api.post("/auth/forgot-password", payload, { timeout: EMAIL_REQUEST_TIMEOUT_MS });

export const resetPassword = (payload) => api.post("/auth/reset-password", payload);
