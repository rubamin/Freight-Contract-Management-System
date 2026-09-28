import api from "./api";

export const login = (credentials) => api.post("/auth/login", credentials);

export const getProfile = () => api.get("/auth/me");

