const { Op } = require("sequelize");
const { InvoiceHeader } = require("../models");
const approvalWorkflowService = require("../services/approvalWorkflow.service");
const { deliverNotices, withMailWarnings } = require("../services/approvalMail.service");
const { getInvoiceAccessWhere } = require("../utils/invoiceAccess");
const { TASK_STATUS, APPROVAL_STATUS_LABELS } = require("../constants/approvalWorkflow");

const sendError = (res, error) => {
  console.error("Approval workflow error:", error);
  return res.status(error.statusCode || 500).json({ success: false, message: error.message });
};

const assertInvoiceAccess = async (invoiceId, user) => {
  const accessWhere = await getInvoiceAccessWhere(user);
  const invoice = await InvoiceHeader.findOne({
    where: accessWhere ? { [Op.and]: [{ InvoiceID: invoiceId }, accessWhere] } : { InvoiceID: invoiceId },
    attributes: ["InvoiceID"],
  });
  if (!invoice) {
    const error = new Error("Invoice not found or outside your assigned locations.");
    error.statusCode = 404;
    throw error;
  }
};

const getLocationWorkflow = async (req, res) => {
  try {
    const data = await approvalWorkflowService.getLocationWorkflow(req.params.locationId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

const saveLocationWorkflow = async (req, res) => {
  try {
    const { locationCount } = await approvalWorkflowService.saveLocationWorkflow(
      { ...req.body, locationId: req.params.locationId },
      req.user.UserID
    );
    return res.status(200).json({
      success: true,
      message: `Approval workflow saved for ${locationCount} location(s).`,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSelectableApprovers = async (req, res) => {
  try {
    const data = await approvalWorkflowService.getSelectableApprovers(req.params.locationId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getMyTasks = async (req, res) => {
  try {
    const data = await approvalWorkflowService.getMyTasks({ user: req.user, view: req.query.view });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getPendingTaskCount = async (req, res) => {
  try {
    const count = await approvalWorkflowService.getPendingTaskCount(req.user);
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    return sendError(res, error);
  }
};

const getInvoiceTimeline = async (req, res) => {
  try {
    await assertInvoiceAccess(req.params.invoiceId, req.user);
    const data = await approvalWorkflowService.getInvoiceTimeline(req.params.invoiceId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

const actOnInvoice = (decision) => async (req, res) => {
  try {
    const result = await approvalWorkflowService.actOnInvoice({
      invoiceId: req.params.invoiceId,
      user: req.user,
      decision,
      remarks: req.body?.remarks,
    });
    const { failures } = await deliverNotices(result.notices);
    const verb = decision === TASK_STATUS.APPROVED ? "approved" : "rejected";
    return res.status(200).json({
      success: true,
      message: withMailWarnings(
        `Invoice ${result.invoiceNumber} ${verb}. Status: ${APPROVAL_STATUS_LABELS[result.approvalStatus]}.`,
        failures
      ),
      data: { approvalStatus: result.approvalStatus },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getLocationWorkflow,
  saveLocationWorkflow,
  getSelectableApprovers,
  getMyTasks,
  getPendingTaskCount,
  getInvoiceTimeline,
  approveInvoice: actOnInvoice(TASK_STATUS.APPROVED),
  rejectInvoice: actOnInvoice(TASK_STATUS.REJECTED),
};
