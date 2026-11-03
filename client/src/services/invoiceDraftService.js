import api from "./api";
import { UPLOAD_TIMEOUT_MS } from "../constants/addInvoice";

const DRAFTS_PATH = "/invoices/drafts";

const multipartConfig = { headers: { "Content-Type": "multipart/form-data" }, timeout: UPLOAD_TIMEOUT_MS };

// files: [{ key, file }] - sent as file_<key> next to the draft JSON.
const toMultipart = (draft, files) => {
  const formData = new FormData();
  formData.append("draft", JSON.stringify(draft));
  files.forEach(({ key, file }) => formData.append(`file_${key}`, file));
  return formData;
};

export const listInvoiceDrafts = async () => (await api.get(DRAFTS_PATH)).data?.data || [];

export const getInvoiceDraft = async (draftId) => (await api.get(`${DRAFTS_PATH}/${draftId}`)).data?.data;

// Creates a draft, or replaces it when draftId is given.
export const saveInvoiceDraft = async ({ draftId = null, draft, files }) => {
  const body = toMultipart(draft, files);
  const response = draftId
    ? await api.put(`${DRAFTS_PATH}/${draftId}`, body, multipartConfig)
    : await api.post(DRAFTS_PATH, body, multipartConfig);
  return response.data?.data;
};

export const deleteInvoiceDraft = (draftId) => api.delete(`${DRAFTS_PATH}/${draftId}`);

export const downloadInvoiceDraftFile = async (draftId, fileKey) =>
  (await api.get(`${DRAFTS_PATH}/${draftId}/files/${fileKey}`, { responseType: "blob", timeout: UPLOAD_TIMEOUT_MS })).data;

// Active users who can access the draft's location(s), except you and the owner.
export const getDraftShareCandidates = async (draftId) =>
  (await api.get(`${DRAFTS_PATH}/${draftId}/share-candidates`)).data?.data || [];

// Shares the draft; each user gets an in-app notification and a mail with the comment.
export const shareInvoiceDraft = (draftId, { userIds, comment }) =>
  api.post(`${DRAFTS_PATH}/${draftId}/share`, { userIds, comment });
