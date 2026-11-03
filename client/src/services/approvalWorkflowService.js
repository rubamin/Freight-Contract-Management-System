import api from "./api";

const unwrap = (response) => response.data?.data;

// Hierarchy & Approval Workflow page.
export const getLocationWorkflow = (locationId) =>
  api.get(`/approval-workflow/locations/${locationId}`).then(unwrap);
export const saveLocationWorkflow = (locationId, payload) =>
  api.put(`/approval-workflow/locations/${locationId}`, payload);

// Approver list the uploader picks from on Add Invoice; null when the
// location has no such step.
export const getSelectableApprovers = (locationId) =>
  api.get(`/approval-workflow/locations/${locationId}/selectable-approvers`).then(unwrap);

// My Approvals page.
export const getMyApprovalTasks = (view) =>
  api.get("/approval-workflow/my-tasks", { params: { view } }).then(unwrap);
export const approveInvoice = (invoiceId, remarks) =>
  api.post(`/approval-workflow/invoices/${invoiceId}/approve`, { remarks });
export const rejectInvoice = (invoiceId, remarks) =>
  api.post(`/approval-workflow/invoices/${invoiceId}/reject`, { remarks });

// Full approval record of one invoice.
export const getInvoiceTimeline = (invoiceId) =>
  api.get(`/approval-workflow/invoices/${invoiceId}/timeline`).then(unwrap);
