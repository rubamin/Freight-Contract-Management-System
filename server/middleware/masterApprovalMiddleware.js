const masterApprovalService = require("../services/masterApproval.service");
const { MASTER_REQUEST_OPERATIONS } = require("../constants/masterApproval");

const resolveModuleKey = (moduleKeyOrResolver, req) =>
  (typeof moduleKeyOrResolver === "function" ? moduleKeyOrResolver(req) : moduleKeyOrResolver);

const buildPendingMessage = (approvers) =>
  `Sent for approval to ${approvers.join(", ") || "the approver"}. It will be saved once it is approved - track it under Master Approvals.`;

/**
 * Holds a master Add / Edit / bulk upload for approval when the admin
 * turned approval on for it (Master Approval Workflow). Otherwise the
 * request goes on to its normal controller and saves directly.
 * Responds 202 with { pendingApproval: true } when the change is held.
 *
 * @param {string|function(object): (string|null)} moduleKeyOrResolver - Master key, or a resolver from the request.
 * @param {string} actionType - MASTER_ACTIONS.ADD | MASTER_ACTIONS.EDIT.
 * @param {string} [operation] - MASTER_REQUEST_OPERATIONS.SINGLE (default) | BULK.
 */
const holdForApproval = (moduleKeyOrResolver, actionType, operation = MASTER_REQUEST_OPERATIONS.SINGLE) =>
  async (req, res, next) => {
    try {
      const moduleKey = resolveModuleKey(moduleKeyOrResolver, req);
      const approverIds = await masterApprovalService.getApproversForChange(moduleKey, actionType, req.user);
      if (!approverIds.length) return next();

      const result = await masterApprovalService.submitRequest({
        moduleKey,
        actionType,
        operation,
        recordId: req.params.id,
        payload: req.body,
        file: req.file,
        user: req.user,
        approverIds,
      });

      return res.status(202).json({
        success: true,
        pendingApproval: true,
        message: buildPendingMessage(result.approvers),
        data: { requestId: result.requestId },
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  };

module.exports = { holdForApproval };
