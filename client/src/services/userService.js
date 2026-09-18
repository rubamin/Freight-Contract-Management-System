import api from "./api";

// Profile update accepts either a plain object (JSON) or a FormData instance
// (when a new profile photo file is included). Axios sets the correct
// Content-Type automatically based on the payload type.
export const updateProfile = (payload) => api.put("/users/profile", payload);

export const changePassword = (payload) => api.put("/users/change-password", payload);

export const getPreferences = () => api.get("/users/preferences");

export const updatePreferences = (payload) => api.put("/users/preferences", payload);

export const requestLocationAccess = (plantId) =>
  api.post("/users/preferences/request-location-access", { plantId });

// ==========================================
//  ADMIN USER MANAGEMENT (task item 4)
// ==========================================
export const listUsers = (params) => api.get("/users", { params });
export const getUserById = (id) => api.get(`/users/${id}`);
export const createUser = (payload) => api.post("/users", payload);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);
export const setUserActive = (id, isActive) => api.put(`/users/${id}/active`, { isActive });
export const listRoles = () => api.get("/users/roles");

export const getMyPermissions = () => api.get("/permissions/me");
export const getUserPermissions = (userId) => api.get(`/permissions/${userId}`);
export const updateUserModulePermissions = (userId, permissions) =>
  api.put(`/permissions/${userId}/modules`, { permissions });
export const updateUserLocationPermissions = (userId, plantIds) =>
  api.put(`/permissions/${userId}/locations`, { plantIds });
