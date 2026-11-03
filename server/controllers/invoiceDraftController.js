const invoiceDraftService = require("../services/invoiceDraft.service");
const { withMailWarnings } = require("../services/approvalMail.service");

const sendError = (res, error, fallbackMessage) => {
  if (!error.statusCode) console.error(fallbackMessage, error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : fallbackMessage,
  });
};

const listDrafts = async (req, res) => {
  try {
    const drafts = await invoiceDraftService.listDrafts(req.user.UserID);
    return res.status(200).json({ success: true, data: drafts });
  } catch (error) {
    return sendError(res, error, "Failed to load drafts.");
  }
};

const getDraft = async (req, res) => {
  try {
    const draft = await invoiceDraftService.getDraft(req.user.UserID, req.params.id);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    return sendError(res, error, "Failed to load the draft.");
  }
};

const saveDraft = async (req, res) => {
  try {
    const draft = await invoiceDraftService.saveDraft({
      userId: req.user.UserID,
      draftId: req.params.id || null,
      body: req.body,
      files: req.files || [],
    });
    return res.status(req.params.id ? 200 : 201).json({ success: true, message: "Draft saved.", data: draft });
  } catch (error) {
    return sendError(res, error, "Failed to save the draft.");
  }
};

const deleteDraft = async (req, res) => {
  try {
    await invoiceDraftService.deleteDraft(req.user.UserID, req.params.id);
    return res.status(200).json({ success: true, message: "Draft deleted." });
  } catch (error) {
    return sendError(res, error, "Failed to delete the draft.");
  }
};

const downloadDraftFile = async (req, res) => {
  try {
    const file = await invoiceDraftService.getDraftFile(req.user.UserID, req.params.id, req.params.fileKey);
    if (file.mimeType) res.type(file.mimeType);
    return res.download(file.fullPath, file.originalName);
  } catch (error) {
    return sendError(res, error, "Failed to load the draft attachment.");
  }
};

const getShareCandidates = async (req, res) => {
  try {
    const users = await invoiceDraftService.getShareCandidates(req.user.UserID, req.params.id);
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return sendError(res, error, "Failed to load the users to share with.");
  }
};

const shareDraft = async (req, res) => {
  try {
    const { sharedWith, mailFailures } = await invoiceDraftService.shareDraft({
      user: req.user,
      draftId: req.params.id,
      userIds: req.body?.userIds,
      comment: req.body?.comment,
    });
    const message = `Draft shared with ${sharedWith.join(", ")}.`;
    return res.status(200).json({
      success: true,
      message: withMailWarnings(message, mailFailures),
      data: { sharedWith },
    });
  } catch (error) {
    return sendError(res, error, "Failed to share the draft.");
  }
};

module.exports = { listDrafts, getDraft, saveDraft, deleteDraft, downloadDraftFile, getShareCandidates, shareDraft };
