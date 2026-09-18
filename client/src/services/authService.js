import api from "./api";

export const login = (credentials) => api.post("/auth/login", credentials);

export const getProfile = () => api.get("/auth/me");
<<<<<<< HEAD

export const forgotPassword = (payload) => api.post("/auth/forgot-password", payload);

export const resetPassword = (payload) => api.post("/auth/reset-password", payload);
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
