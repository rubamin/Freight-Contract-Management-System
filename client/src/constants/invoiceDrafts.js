// Saved invoice drafts - keep in sync with server/constants/invoiceDrafts.js.
// ADD: a saved Add Invoice page. EDIT: unsaved changes of existing
// invoices; nothing is audited or sent for approval until they are saved.
export const DRAFT_TYPES = {
  ADD: "ADD",
  EDIT: "EDIT",
};

export const DRAFT_TYPE_LABELS = {
  [DRAFT_TYPES.ADD]: "New invoices",
  [DRAFT_TYPES.EDIT]: "Edit of saved invoices",
};

// Page each draft type opens on; the draftId (navigation state or query
// parameter, used by the share mail link) resumes it.
export const DRAFT_PAGE_PATHS = {
  [DRAFT_TYPES.ADD]: "/invoices/add",
  [DRAFT_TYPES.EDIT]: "/invoices/edit",
};

export const DRAFT_ID_QUERY_PARAM = "draftId";

export const MAX_SHARE_COMMENT_LENGTH = 1000;
