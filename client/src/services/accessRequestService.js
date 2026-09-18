import api from "./api";

// Generalized access-request flow (task item 19) - a user can request
// access to any module permission or a specific plant/location.
export const createAccessRequest = (payload) => api.post("/access-requests", payload);

// Admin-only (task item 20).
export const listPendingAccessRequests = () => api.get("/access-requests/pending");
export const resolveAccessRequest = (id, decision) =>
  api.put(`/access-requests/${id}/resolve`, { decision });
