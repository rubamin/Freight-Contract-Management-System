// Master saves answer 202 { pendingApproval: true } when the change was
// held for approval (Master Approval Workflow) instead of being saved.
export const isPendingApproval = (payload) => Boolean(payload?.pendingApproval);

// Success message of a master save: the approval notice when held,
// otherwise the page's own message.
export const getSaveSuccessMessage = (payload, savedMessage) =>
  (isPendingApproval(payload) ? payload.message : savedMessage);

// Pages wait a little longer before leaving when the approval notice
// has to be read.
export const SAVED_REDIRECT_DELAY_MS = 1000;
export const PENDING_REDIRECT_DELAY_MS = 2500;

export const getRedirectDelay = (payload) =>
  (isPendingApproval(payload) ? PENDING_REDIRECT_DELAY_MS : SAVED_REDIRECT_DELAY_MS);
