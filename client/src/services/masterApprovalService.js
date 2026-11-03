import api from "./api";

const unwrap = (response) => response.data?.data;

// Master Approval Workflow page (Admin).
export const getMasterApprovalSettings = () => api.get("/master-approvals/settings").then(unwrap);
export const saveMasterApprovalSettings = (modules) => api.put("/master-approvals/settings", { modules });

// Master Approvals page.
export const getMasterRequests = (view) => api.get("/master-approvals/requests", { params: { view } }).then(unwrap);
export const getMasterRequestSummary = () => api.get("/master-approvals/requests/summary").then(unwrap);
export const getMasterRequest = (requestId) => api.get(`/master-approvals/requests/${requestId}`).then(unwrap);
export const downloadMasterRequestFile = (requestId) =>
  api.get(`/master-approvals/requests/${requestId}/file`, { responseType: "blob" });
export const approveMasterRequest = (requestId, remarks) =>
  api.post(`/master-approvals/requests/${requestId}/approve`, { remarks });
export const rejectMasterRequest = (requestId, remarks) =>
  api.post(`/master-approvals/requests/${requestId}/reject`, { remarks });
export const cancelMasterRequest = (requestId) => api.post(`/master-approvals/requests/${requestId}/cancel`);
