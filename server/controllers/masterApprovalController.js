const masterApprovalService = require("../services/masterApproval.service");
const { MASTER_REQUEST_DECISIONS } = require("../constants/masterApproval");

const sendError = (res, error) =>
  res.status(error.statusCode || 400).json({ success: false, message: error.message });

const getSettings = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await masterApprovalService.getSettingsPage() });
  } catch (error) {
    return sendError(res, error);
  }
};

const saveSettings = async (req, res) => {
  try {
    const modules = await masterApprovalService.saveSettings(req.body.modules, req.user.UserID);
    return res.status(200).json({ success: true, message: "Master approval workflow saved.", data: modules });
  } catch (error) {
    return sendError(res, error);
  }
};

const listRequests = async (req, res) => {
  try {
    const data = await masterApprovalService.listRequests({ user: req.user, view: req.query.view });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSummary = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await masterApprovalService.getSummary(req.user) });
  } catch (error) {
    return sendError(res, error);
  }
};

const getRequest = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await masterApprovalService.getRequest(req.params.id, req.user) });
  } catch (error) {
    return sendError(res, error);
  }
};

const downloadRequestFile = async (req, res) => {
  try {
    const { absolutePath, fileName } = await masterApprovalService.getRequestFile(req.params.id, req.user);
    return res.download(absolutePath, fileName);
  } catch (error) {
    return sendError(res, error);
  }
};

const decide = (decision) => async (req, res) => {
  try {
    const result = await masterApprovalService.actOnRequest({
      requestId: req.params.id,
      user: req.user,
      decision,
      remarks: req.body?.remarks,
      ip: req.ip,
    });
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return sendError(res, error);
  }
};

const cancelRequest = async (req, res) => {
  try {
    const result = await masterApprovalService.cancelRequest({ requestId: req.params.id, user: req.user });
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getSettings,
  saveSettings,
  listRequests,
  getSummary,
  getRequest,
  downloadRequestFile,
  approveRequest: decide(MASTER_REQUEST_DECISIONS.APPROVE),
  rejectRequest: decide(MASTER_REQUEST_DECISIONS.REJECT),
  cancelRequest,
};
