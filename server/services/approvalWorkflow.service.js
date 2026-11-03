const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const notificationService = require("./notification.service");
const { NOTICE_KINDS } = require("./approvalMail.service");
const { isAdminRole } = require("../constants/roles");
const {
  STEP_TYPES,
  ASSIGN_MODES,
  APPROVAL_STATUS,
  TASK_STATUS,
  EVENT_TYPES,
  ROUTING_OUTCOMES,
  UNROUTED_STATUS,
  MAX_WORKFLOW_STEPS,
  MAX_STEP_NAME_LENGTH,
  MAX_ACTION_REMARKS_LENGTH,
} = require("../constants/approvalWorkflow");
const {
  NOTIFICATION_TYPE_APPROVAL_REQUIRED,
  NOTIFICATION_TYPE_INVOICE_SHARED,
  NOTIFICATION_TYPE_INVOICE_APPROVED,
  NOTIFICATION_TYPE_INVOICE_REJECTED,
} = require("../constants/notificationTypes");

const MAX_EVENT_DETAILS_LENGTH = 1000;
const MAX_TASK_LIST_ROWS = 500;

const select = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });

const execute = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, transaction });

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const uniqueIds = (ids) => [...new Set(ids.filter((id) => id != null && id !== "").map(Number))];

const displayName = (user) => user?.FullName || user?.Email || `User #${user?.UserID}`;

const joinNames = (users) => users.map(displayName).join(", ");

// =====================================================================
//  Configuration (Hierarchy & Approval Workflow page)
// =====================================================================

const STEP_COLUMNS = "s.StepID, s.LocationID, s.StepOrder, s.StepName, s.StepType, s.AssignMode";

const attachStepUsers = async (steps, transaction) => {
  if (!steps.length) return [];
  const users = await select(
    `SELECT su.StepID, u.UserID, u.FullName, u.Email, u.IsActive, r.RoleName
     FROM ApprovalWorkflowStepUsers su
     JOIN Users u ON u.UserID = su.UserID
     LEFT JOIN Roles r ON r.RoleID = u.RoleID
     WHERE su.StepID IN (:stepIds)
     ORDER BY u.FullName`,
    { stepIds: steps.map((step) => step.StepID) },
    transaction
  );
  return steps.map((step) => ({
    ...step,
    users: users
      .filter((user) => user.StepID === step.StepID)
      .map(({ StepID, ...user }) => ({ ...user, IsActive: Boolean(user.IsActive) })),
  }));
};

const toRouting = (settings) => ({
  [ROUTING_OUTCOMES.DISCREPANCY]: settings?.DiscrepancyStartStep ?? null,
  [ROUTING_OUTCOMES.SYSTEM_APPROVED]: settings?.SystemApprovedStartStep ?? null,
  [ROUTING_OUTCOMES.PRE_APPROVED]: settings?.PreApprovedStartStep ?? null,
});

const getLocationWorkflow = async (locationId, transaction) => {
  if (!locationId) return { locationId: null, steps: [], routing: toRouting(null) };
  const steps = await select(
    `SELECT ${STEP_COLUMNS} FROM ApprovalWorkflowSteps s WHERE s.LocationID = :locationId ORDER BY s.StepOrder`,
    { locationId },
    transaction
  );
  const [settings] = await select(
    "SELECT * FROM ApprovalWorkflowSettings WHERE LocationID = :locationId",
    { locationId },
    transaction
  );
  return { locationId: Number(locationId), steps: await attachStepUsers(steps, transaction), routing: toRouting(settings) };
};

// Every configured location, for the summary shown in the hierarchy tree.
const getAllWorkflows = async () => {
  const steps = await attachStepUsers(
    await select(`SELECT ${STEP_COLUMNS} FROM ApprovalWorkflowSteps s ORDER BY s.LocationID, s.StepOrder`, {}),
  );
  const settings = await select("SELECT * FROM ApprovalWorkflowSettings", {});
  const locationIds = uniqueIds([...steps.map((step) => step.LocationID), ...settings.map((row) => row.LocationID)]);
  return locationIds.map((locationId) => ({
    locationId,
    steps: steps.filter((step) => Number(step.LocationID) === locationId),
    routing: toRouting(settings.find((row) => Number(row.LocationID) === locationId)),
  }));
};

const normalizeSteps = (steps) => (Array.isArray(steps) ? steps : []).map((step, index) => ({
  StepOrder: index + 1,
  StepName: String(step?.stepName || "").trim(),
  StepType: step?.stepType,
  AssignMode: step?.assignMode,
  userIds: uniqueIds(Array.isArray(step?.userIds) ? step.userIds : []),
}));

const assertValidSteps = (steps) => {
  if (steps.length > MAX_WORKFLOW_STEPS) throw httpError(`A workflow can have at most ${MAX_WORKFLOW_STEPS} steps.`);
  steps.forEach((step) => {
    const label = `Step ${step.StepOrder}`;
    if (!step.StepName) throw httpError(`${label}: name is required.`);
    if (step.StepName.length > MAX_STEP_NAME_LENGTH) throw httpError(`${label}: name is longer than ${MAX_STEP_NAME_LENGTH} characters.`);
    if (!Object.values(STEP_TYPES).includes(step.StepType)) throw httpError(`${label}: invalid step type.`);
    if (!Object.values(ASSIGN_MODES).includes(step.AssignMode)) throw httpError(`${label}: invalid assignment.`);
    if (step.AssignMode === ASSIGN_MODES.UPLOADER_SELECTS && step.StepType !== STEP_TYPES.APPROVAL) {
      throw httpError(`${label}: only an approval step can be selected by the uploader.`);
    }
    if (!step.userIds.length) throw httpError(`${label}: assign at least one user.`);
  });
  if (steps.filter((step) => step.AssignMode === ASSIGN_MODES.UPLOADER_SELECTS).length > 1) {
    throw httpError("Only one step per location can be selected by the uploader.");
  }
};

const assertActiveUsers = async (steps, transaction) => {
  const userIds = uniqueIds(steps.flatMap((step) => step.userIds));
  if (!userIds.length) return;
  const found = await select("SELECT UserID FROM Users WHERE UserID IN (:userIds) AND IsActive = 1", { userIds }, transaction);
  if (found.length !== userIds.length) throw httpError("One or more selected users are inactive or do not exist.");
};

const toStepOrder = (value, stepCount, label) => {
  if (value === null || value === undefined || value === "") return null;
  const order = Number(value);
  if (!Number.isInteger(order) || order < 1 || order > stepCount) throw httpError(`${label}: choose a valid step.`);
  return order;
};

const normalizeRouting = (routing, steps) => {
  const result = {
    [ROUTING_OUTCOMES.DISCREPANCY]: toStepOrder(routing?.[ROUTING_OUTCOMES.DISCREPANCY], steps.length, "Discrepancy routing"),
    [ROUTING_OUTCOMES.SYSTEM_APPROVED]: toStepOrder(routing?.[ROUTING_OUTCOMES.SYSTEM_APPROVED], steps.length, "System approved routing"),
    [ROUTING_OUTCOMES.PRE_APPROVED]: toStepOrder(routing?.[ROUTING_OUTCOMES.PRE_APPROVED], steps.length, "Pre-approved routing"),
  };
  const discrepancyStart = result[ROUTING_OUTCOMES.DISCREPANCY];
  if (steps.length && !discrepancyStart) throw httpError("Choose the step where discrepancy invoices start.");
  if (discrepancyStart && !steps.some((step) => step.StepOrder >= discrepancyStart && step.StepType === STEP_TYPES.APPROVAL)) {
    throw httpError("Discrepancy invoices must reach at least one approval step.");
  }
  return result;
};

// The location itself, or every active location of its plant.
const getTargetLocationIds = async (locationId, applyToPlant, transaction) => {
  const [location] = await select(
    "SELECT LocationID, PlantHierarchyID FROM PlantLocations WHERE LocationID = :locationId",
    { locationId },
    transaction
  );
  if (!location) throw httpError("Location not found.", 404);
  if (!applyToPlant) return [location.LocationID];
  const siblings = await select(
    "SELECT LocationID FROM PlantLocations WHERE PlantHierarchyID = :plantId AND IsActive = 1",
    { plantId: location.PlantHierarchyID },
    transaction
  );
  return uniqueIds([location.LocationID, ...siblings.map((row) => row.LocationID)]);
};

const replaceLocationWorkflow = async (locationId, steps, routing, userId, transaction) => {
  await execute("DELETE FROM ApprovalWorkflowSteps WHERE LocationID = :locationId", { locationId }, transaction);
  for (const step of steps) {
    const [inserted] = await sequelize.query(
      `INSERT INTO ApprovalWorkflowSteps (LocationID, StepOrder, StepName, StepType, AssignMode, UpdatedBy)
       OUTPUT INSERTED.StepID
       VALUES (:locationId, :stepOrder, :stepName, :stepType, :assignMode, :userId)`,
      {
        replacements: { locationId, stepOrder: step.StepOrder, stepName: step.StepName, stepType: step.StepType, assignMode: step.AssignMode, userId },
        type: QueryTypes.INSERT,
        transaction,
      }
    );
    for (const stepUserId of step.userIds) {
      await execute(
        "INSERT INTO ApprovalWorkflowStepUsers (StepID, UserID) VALUES (:stepId, :stepUserId)",
        { stepId: inserted[0].StepID, stepUserId },
        transaction
      );
    }
  }
  await execute("DELETE FROM ApprovalWorkflowSettings WHERE LocationID = :locationId", { locationId }, transaction);
  await execute(
    `INSERT INTO ApprovalWorkflowSettings (LocationID, DiscrepancyStartStep, SystemApprovedStartStep, PreApprovedStartStep, UpdatedAt, UpdatedBy)
     VALUES (:locationId, :discrepancy, :systemApproved, :preApproved, GETDATE(), :userId)`,
    {
      locationId,
      discrepancy: routing[ROUTING_OUTCOMES.DISCREPANCY],
      systemApproved: routing[ROUTING_OUTCOMES.SYSTEM_APPROVED],
      preApproved: routing[ROUTING_OUTCOMES.PRE_APPROVED],
      userId,
    },
    transaction
  );
};

const saveLocationWorkflow = async ({ locationId, steps, routing, applyToPlant }, userId) => {
  const normalizedSteps = normalizeSteps(steps);
  assertValidSteps(normalizedSteps);
  const normalizedRouting = normalizeRouting(routing, normalizedSteps);

  return sequelize.transaction(async (transaction) => {
    await assertActiveUsers(normalizedSteps, transaction);
    const locationIds = await getTargetLocationIds(locationId, Boolean(applyToPlant), transaction);
    for (const targetLocationId of locationIds) {
      await replaceLocationWorkflow(targetLocationId, normalizedSteps, normalizedRouting, userId, transaction);
    }
    return { locationCount: locationIds.length };
  });
};

// The approver list the uploader picks from on Add Invoice (e.g. HOD).
const getSelectableApprovers = async (locationId) => {
  const { steps } = await getLocationWorkflow(locationId);
  const step = steps.find((entry) => entry.AssignMode === ASSIGN_MODES.UPLOADER_SELECTS);
  if (!step) return null;
  return {
    stepOrder: step.StepOrder,
    stepName: step.StepName,
    users: step.users.filter((user) => user.IsActive).map(({ UserID, FullName, Email, RoleName }) => ({ UserID, FullName, Email, RoleName })),
  };
};

// =====================================================================
//  Runtime - one invoice moving through the steps
// =====================================================================

const loadInvoice = async (invoiceId, transaction) => {
  const [invoice] = await select(
    `SELECT h.InvoiceID, h.InvoiceNumber, h.InvoiceDate, h.LocationID, h.LocationName, h.FromStation, h.ToStation,
            h.LRNumber, h.TotalInvoiceAmount, h.Remarks, h.UploadedBy, h.SelectedApproverUserID, h.ApprovalStatus,
            h.CurrentStepOrder, h.Doc1Path, h.Doc2Path, h.Doc3Path, v.VendorName, ver.ExpectedAmount, ver.VerificationStatus
     FROM InvoiceHeader h
     LEFT JOIN Vendors v ON v.VendorID = h.VendorID
     OUTER APPLY (
       SELECT TOP 1 iv.ExpectedAmount, iv.VerificationStatus
       FROM InvoiceVerification iv WHERE iv.InvoiceID = h.InvoiceID ORDER BY iv.VerificationID DESC
     ) ver
     WHERE h.InvoiceID = :invoiceId`,
    { invoiceId },
    transaction
  );
  return invoice || null;
};

const logEvent = (invoiceId, { eventType, step = null, actorUserId = null, details = null }, transaction) =>
  execute(
    `INSERT INTO InvoiceWorkflowEvents (InvoiceID, EventType, StepOrder, StepName, ActorUserID, Details)
     VALUES (:invoiceId, :eventType, :stepOrder, :stepName, :actorUserId, :details)`,
    {
      invoiceId,
      eventType,
      stepOrder: step?.StepOrder ?? null,
      stepName: step?.StepName ?? null,
      actorUserId: actorUserId ?? null,
      details: details ? String(details).slice(0, MAX_EVENT_DETAILS_LENGTH) : null,
    },
    transaction
  );

// Records the draft and creation history of a newly saved invoice row.
// The draft date is copied inside SQL so the DATETIME never round-trips
// through a JS Date (and its timezone conversion).
const recordInvoiceCreated = async ({ invoiceId, actorUserId, draftId }, transaction) => {
  const parsedDraftId = Number(draftId);
  if (Number.isInteger(parsedDraftId) && parsedDraftId > 0) {
    // The draft may be the actor's own or one shared with them.
    const draftWhere = `FROM InvoiceDrafts d WHERE d.DraftID = :draftId AND (d.UserID = :actorUserId
      OR EXISTS (SELECT 1 FROM InvoiceDraftShares ds WHERE ds.DraftID = d.DraftID AND ds.UserID = :actorUserId))`;
    await execute(
      `UPDATE InvoiceHeader SET DraftCreatedAt = (SELECT d.CreatedAt ${draftWhere}) WHERE InvoiceID = :invoiceId`,
      { invoiceId, draftId: parsedDraftId, actorUserId },
      transaction
    );
    await execute(
      `INSERT INTO InvoiceWorkflowEvents (InvoiceID, EventType, ActorUserID, Details, EventAt)
       SELECT :invoiceId, :eventType, :actorUserId, :details, d.CreatedAt ${draftWhere}`,
      { invoiceId, eventType: EVENT_TYPES.DRAFT_CREATED, actorUserId, details: "Invoice saved as a draft.", draftId: parsedDraftId },
      transaction
    );
  }
  await logEvent(invoiceId, { eventType: EVENT_TYPES.CREATED, actorUserId, details: "Invoice created." }, transaction);
};

const setStatus = (invoiceId, status, currentStepOrder, transaction) =>
  execute(
    "UPDATE InvoiceHeader SET ApprovalStatus = :status, CurrentStepOrder = :currentStepOrder WHERE InvoiceID = :invoiceId",
    { invoiceId, status, currentStepOrder },
    transaction
  );

const insertTasks = async (invoiceId, step, users, taskStatus, transaction) => {
  const isDone = taskStatus !== TASK_STATUS.PENDING;
  for (const user of users) {
    await execute(
      `INSERT INTO InvoiceApprovalTasks (InvoiceID, StepOrder, StepName, StepType, AssignedUserID, TaskStatus, ActedAt)
       VALUES (:invoiceId, :stepOrder, :stepName, :stepType, :userId, :taskStatus, ${isDone ? "GETDATE()" : "NULL"})`,
      { invoiceId, stepOrder: step.StepOrder, stepName: step.StepName, stepType: step.StepType, userId: user.UserID, taskStatus },
      transaction
    );
  }
};

const notifyInApp = async (payload, transaction) => {
  try {
    await notificationService.notify(payload, transaction);
  } catch (error) {
    console.error("Workflow notification write failed:", error);
  }
};

// The uploader's pick on an UPLOADER_SELECTS step, else every active
// step user (e.g. an older invoice saved before an approver was chosen).
const resolveAssignees = (step, selectedApproverUserId) => {
  const active = step.users.filter((user) => user.IsActive);
  if (step.AssignMode === ASSIGN_MODES.UPLOADER_SELECTS) {
    const chosen = active.find((user) => Number(user.UserID) === Number(selectedApproverUserId));
    if (chosen) return [chosen];
  }
  return active;
};

const addNotice = (context, notice) => {
  const entry = { invoice: context.invoice, ...notice };
  context.notices.push(entry);
  return entry;
};

const completeWorkflow = async (context, transaction) => {
  const { invoice } = context;
  if (!context.approver) {
    const status = UNROUTED_STATUS[context.outcome];
    await setStatus(invoice.InvoiceID, status, null, transaction);
    return status;
  }

  await setStatus(invoice.InvoiceID, APPROVAL_STATUS.APPROVED, null, transaction);
  await execute(
    "UPDATE InvoiceHeader SET FinalApprovedAt = GETDATE(), FinalApprovedBy = :userId WHERE InvoiceID = :invoiceId",
    { invoiceId: invoice.InvoiceID, userId: context.approver.UserID },
    transaction
  );
  await logEvent(invoice.InvoiceID, {
    eventType: EVENT_TYPES.FINAL_APPROVED,
    actorUserId: context.approver.UserID,
    details: `Invoice fully approved by ${displayName(context.approver)}.`,
  }, transaction);
  if (invoice.UploadedBy) {
    addNotice(context, { kind: NOTICE_KINDS.FINAL_APPROVED, recipientUserIds: [invoice.UploadedBy], actorName: displayName(context.approver) });
    await notifyInApp({
      type: NOTIFICATION_TYPE_INVOICE_APPROVED,
      userIds: [invoice.UploadedBy],
      message: `Invoice ${invoice.InvoiceNumber} was approved by ${displayName(context.approver)}.`,
      relatedInvoiceId: invoice.InvoiceID,
    }, transaction);
  }
  return APPROVAL_STATUS.APPROVED;
};

const activateApprovalStep = async (context, step, assignees, transaction) => {
  const { invoice } = context;
  await insertTasks(invoice.InvoiceID, step, assignees, TASK_STATUS.PENDING, transaction);
  await setStatus(invoice.InvoiceID, APPROVAL_STATUS.PENDING_APPROVAL, step.StepOrder, transaction);
  await execute(
    "UPDATE InvoiceHeader SET SubmittedForApprovalAt = ISNULL(SubmittedForApprovalAt, GETDATE()) WHERE InvoiceID = :invoiceId",
    { invoiceId: invoice.InvoiceID },
    transaction
  );
  await logEvent(invoice.InvoiceID, {
    eventType: context.approver ? EVENT_TYPES.FORWARDED : EVENT_TYPES.SUBMITTED_FOR_APPROVAL,
    step,
    actorUserId: context.actorUserId,
    details: `Sent for approval to ${joinNames(assignees)}.`,
  }, transaction);
  addNotice(context, { kind: NOTICE_KINDS.ACTION_REQUIRED, recipientUserIds: assignees.map((user) => user.UserID), stepName: step.StepName });
  await notifyInApp({
    type: NOTIFICATION_TYPE_APPROVAL_REQUIRED,
    userIds: assignees.map((user) => user.UserID),
    message: `Invoice ${invoice.InvoiceNumber} is waiting for your approval (${step.StepName}).`,
    relatedInvoiceId: invoice.InvoiceID,
  }, transaction);
  context.firstAssignment = context.firstAssignment || { step, assignees };
  return APPROVAL_STATUS.PENDING_APPROVAL;
};

const activateNotifyStep = async (context, step, assignees, transaction) => {
  const { invoice } = context;
  await insertTasks(invoice.InvoiceID, step, assignees, TASK_STATUS.NOTIFIED, transaction);
  await logEvent(invoice.InvoiceID, {
    eventType: EVENT_TYPES.FORWARDED,
    step,
    actorUserId: context.actorUserId,
    details: `Shared for information with ${joinNames(assignees)}.`,
  }, transaction);
  addNotice(context, {
    kind: NOTICE_KINDS.FOR_INFORMATION,
    recipientUserIds: assignees.map((user) => user.UserID),
    stepName: step.StepName,
    actorName: context.approver ? displayName(context.approver) : null,
  });
  await notifyInApp({
    type: NOTIFICATION_TYPE_INVOICE_SHARED,
    userIds: assignees.map((user) => user.UserID),
    message: `Invoice ${invoice.InvoiceNumber} was shared with you (${step.StepName}).`,
    relatedInvoiceId: invoice.InvoiceID,
  }, transaction);
};

// Walks the steps from `fromOrder`: notify steps are passed through, the
// first approval step stops the walk, and running out of steps completes
// the workflow.
const activateFromStep = async (context, steps, fromOrder, transaction) => {
  for (let order = fromOrder; order <= steps.length; order += 1) {
    const step = steps.find((entry) => entry.StepOrder === order);
    const assignees = step ? resolveAssignees(step, context.invoice.SelectedApproverUserID) : [];
    if (!assignees.length) {
      await logEvent(context.invoice.InvoiceID, {
        eventType: EVENT_TYPES.NO_ROUTING,
        step,
        details: `Step ${order} has no active users and was skipped.`,
      }, transaction);
    } else if (step.StepType === STEP_TYPES.APPROVAL) {
      return activateApprovalStep(context, step, assignees, transaction);
    } else {
      await activateNotifyStep(context, step, assignees, transaction);
    }
  }
  return completeWorkflow(context, transaction);
};

// The first mail of a discrepancy goes to the user who entered the data,
// telling them who the invoice was sent to.
const addUploaderNotice = (context) => {
  const { invoice, firstAssignment } = context;
  if (context.outcome !== ROUTING_OUTCOMES.DISCREPANCY || !invoice.UploadedBy) return;
  addNotice(context, {
    kind: NOTICE_KINDS.UPLOADER_SUBMITTED,
    recipientUserIds: [invoice.UploadedBy],
    stepName: firstAssignment?.step.StepName || null,
    sentTo: firstAssignment ? joinNames(firstAssignment.assignees) : null,
  });
};

/**
 * Routes a saved invoice by its audit outcome. Returns the new approval
 * status and the mail notices to deliver once the transaction commits.
 *
 * @param {object} params
 * @param {number} params.invoiceId
 * @param {string} params.outcome - One of ROUTING_OUTCOMES.
 * @param {number} params.actorUserId - User who saved the invoice.
 * @param {import("sequelize").Transaction} transaction
 */
const startWorkflow = async ({ invoiceId, outcome, actorUserId }, transaction) => {
  const invoice = await loadInvoice(invoiceId, transaction);
  const context = { invoice, outcome, actorUserId, approver: null, notices: [], firstAssignment: null };
  const { steps, routing } = await getLocationWorkflow(invoice.LocationID, transaction);
  const startOrder = routing[outcome];

  let approvalStatus;
  if (!startOrder || !steps.some((step) => step.StepOrder === startOrder)) {
    approvalStatus = UNROUTED_STATUS[outcome];
    await setStatus(invoice.InvoiceID, approvalStatus, null, transaction);
    if (outcome === ROUTING_OUTCOMES.DISCREPANCY) {
      await logEvent(invoice.InvoiceID, {
        eventType: EVENT_TYPES.NO_ROUTING,
        actorUserId,
        details: "No approval workflow is configured for this location.",
      }, transaction);
    }
  } else {
    approvalStatus = await activateFromStep(context, steps, startOrder, transaction);
  }

  addUploaderNotice(context);
  if (context.notices.some((notice) => notice.kind === NOTICE_KINDS.UPLOADER_SUBMITTED)) {
    await logEvent(invoice.InvoiceID, {
      eventType: EVENT_TYPES.SENT_TO_UPLOADER,
      actorUserId,
      details: "Discrepancy mail sent to the user who entered the invoice.",
    }, transaction);
  }
  return { approvalStatus, notices: context.notices };
};

// An edited invoice is audited again, so its workflow starts over. Open
// tasks are cancelled; the history stays.
const restartWorkflow = async ({ invoiceId, outcome, actorUserId }, transaction) => {
  await execute(
    "UPDATE InvoiceApprovalTasks SET TaskStatus = :cancelled, ActedAt = GETDATE() WHERE InvoiceID = :invoiceId AND TaskStatus = :pending",
    { invoiceId, cancelled: TASK_STATUS.CANCELLED, pending: TASK_STATUS.PENDING },
    transaction
  );
  await execute(
    "UPDATE InvoiceHeader SET FinalApprovedAt = NULL, FinalApprovedBy = NULL, CurrentStepOrder = NULL WHERE InvoiceID = :invoiceId",
    { invoiceId },
    transaction
  );
  await logEvent(invoiceId, {
    eventType: EVENT_TYPES.WORKFLOW_RESTARTED,
    actorUserId,
    details: "Invoice edited - audit re-run and approval workflow restarted.",
  }, transaction);
  return startWorkflow({ invoiceId, outcome, actorUserId }, transaction);
};

const getPendingTasks = (invoiceId, stepOrder, transaction) =>
  select(
    `SELECT t.TaskID, t.AssignedUserID, u.FullName, u.Email
     FROM InvoiceApprovalTasks t JOIN Users u ON u.UserID = t.AssignedUserID
     WHERE t.InvoiceID = :invoiceId AND t.StepOrder = :stepOrder AND t.TaskStatus = :pending`,
    { invoiceId, stepOrder, pending: TASK_STATUS.PENDING },
    transaction
  );

const getActingTask = (tasks, user) =>
  tasks.find((task) => Number(task.AssignedUserID) === Number(user.UserID))
  || (isAdminRole(user.RoleName) ? tasks[0] : null);

const closeStepTasks = async ({ invoiceId, stepOrder, actingTask, decision, user, remarks }, transaction) => {
  await execute(
    "UPDATE InvoiceApprovalTasks SET TaskStatus = :decision, ActedAt = GETDATE(), ActedBy = :userId, Remarks = :remarks WHERE TaskID = :taskId",
    { decision, userId: user.UserID, remarks, taskId: actingTask.TaskID },
    transaction
  );
  await execute(
    `UPDATE InvoiceApprovalTasks SET TaskStatus = :closed, ActedAt = GETDATE(), ActedBy = :userId
     WHERE InvoiceID = :invoiceId AND StepOrder = :stepOrder AND TaskStatus = :pending`,
    { closed: TASK_STATUS.CLOSED, userId: user.UserID, invoiceId, stepOrder, pending: TASK_STATUS.PENDING },
    transaction
  );
};

const rejectInvoice = async (context, step, remarks, transaction) => {
  const { invoice, approver } = context;
  await setStatus(invoice.InvoiceID, APPROVAL_STATUS.REJECTED, null, transaction);
  if (!invoice.UploadedBy) return APPROVAL_STATUS.REJECTED;
  addNotice(context, {
    kind: NOTICE_KINDS.REJECTED,
    recipientUserIds: [invoice.UploadedBy],
    stepName: step.StepName,
    actorName: displayName(approver),
    remarks,
  });
  await notifyInApp({
    type: NOTIFICATION_TYPE_INVOICE_REJECTED,
    userIds: [invoice.UploadedBy],
    message: `Invoice ${invoice.InvoiceNumber} was rejected by ${displayName(approver)}: ${remarks}`,
    relatedInvoiceId: invoice.InvoiceID,
  }, transaction);
  return APPROVAL_STATUS.REJECTED;
};

/**
 * Approve or reject the current step of an invoice as `user`. Only a user
 * assigned to that step (or an Admin) can act.
 */
const actOnInvoice = async ({ invoiceId, user, decision, remarks }) => {
  const cleanRemarks = String(remarks || "").trim().slice(0, MAX_ACTION_REMARKS_LENGTH) || null;
  if (decision === TASK_STATUS.REJECTED && !cleanRemarks) throw httpError("A reason is required to reject an invoice.");

  return sequelize.transaction(async (transaction) => {
    const invoice = await loadInvoice(invoiceId, transaction);
    if (!invoice) throw httpError("Invoice not found.", 404);
    if (invoice.ApprovalStatus !== APPROVAL_STATUS.PENDING_APPROVAL || !invoice.CurrentStepOrder) {
      throw httpError(`Invoice ${invoice.InvoiceNumber} is not waiting for approval.`);
    }

    const actingTask = getActingTask(await getPendingTasks(invoice.InvoiceID, invoice.CurrentStepOrder, transaction), user);
    if (!actingTask) throw httpError("This invoice is not assigned to you for approval.", 403);

    const { steps } = await getLocationWorkflow(invoice.LocationID, transaction);
    const [snapshot] = await select(
      "SELECT TOP 1 StepOrder, StepName FROM InvoiceApprovalTasks WHERE TaskID = :taskId",
      { taskId: actingTask.TaskID },
      transaction
    );
    const approver = { UserID: user.UserID, FullName: user.FullName, Email: user.Email };
    const onBehalf = Number(actingTask.AssignedUserID) !== Number(user.UserID) ? ` on behalf of ${displayName(actingTask)}` : "";

    await closeStepTasks({ invoiceId: invoice.InvoiceID, stepOrder: invoice.CurrentStepOrder, actingTask, decision, user, remarks: cleanRemarks }, transaction);
    await logEvent(invoice.InvoiceID, {
      eventType: decision === TASK_STATUS.APPROVED ? EVENT_TYPES.APPROVED : EVENT_TYPES.REJECTED,
      step: snapshot,
      actorUserId: user.UserID,
      details: `${decision === TASK_STATUS.APPROVED ? "Approved" : "Rejected"}${onBehalf}${cleanRemarks ? `: ${cleanRemarks}` : "."}`,
    }, transaction);

    const context = { invoice, outcome: ROUTING_OUTCOMES.DISCREPANCY, actorUserId: user.UserID, approver, notices: [], firstAssignment: null };
    const approvalStatus = decision === TASK_STATUS.APPROVED
      ? await activateFromStep(context, steps, invoice.CurrentStepOrder + 1, transaction)
      : await rejectInvoice(context, snapshot, cleanRemarks, transaction);
    return { approvalStatus, invoiceNumber: invoice.InvoiceNumber, notices: context.notices };
  });
};

// "Send Selected Mail" on the Invoice List: a reminder to whoever an
// invoice is waiting for, the workflow start for older pending invoices
// that never had one, and a summary to the location's first approvers
// for everything else.
const prepareSelectedInvoiceNotices = async ({ invoiceIds, user }) =>
  sequelize.transaction(async (transaction) => {
    const notices = [];
    for (const invoiceId of invoiceIds) {
      const invoice = await loadInvoice(invoiceId, transaction);
      const openTasks = invoice.CurrentStepOrder
        ? await getPendingTasks(invoice.InvoiceID, invoice.CurrentStepOrder, transaction)
        : [];

      if (openTasks.length) {
        const [snapshot] = await select("SELECT TOP 1 StepName FROM InvoiceApprovalTasks WHERE TaskID = :taskId", { taskId: openTasks[0].TaskID }, transaction);
        notices.push({ kind: NOTICE_KINDS.REMINDER, invoice, recipientUserIds: openTasks.map((task) => task.AssignedUserID), stepName: snapshot.StepName, actorName: displayName(user) });
      } else if (!invoice.ApprovalStatus || invoice.ApprovalStatus === APPROVAL_STATUS.PENDING_APPROVAL) {
        const started = await startWorkflow({ invoiceId: invoice.InvoiceID, outcome: ROUTING_OUTCOMES.DISCREPANCY, actorUserId: user.UserID }, transaction);
        if (started.approvalStatus !== APPROVAL_STATUS.PENDING_APPROVAL || !started.notices.length) {
          throw httpError(`No approval workflow is configured for the location of invoice ${invoice.InvoiceNumber}.`);
        }
        notices.push(...started.notices);
      } else {
        const { steps, routing } = await getLocationWorkflow(invoice.LocationID, transaction);
        const firstStep = steps.find((step) => step.StepOrder === routing[ROUTING_OUTCOMES.DISCREPANCY]) || steps[0];
        const recipients = firstStep ? resolveAssignees(firstStep, invoice.SelectedApproverUserID) : [];
        if (!recipients.length) throw httpError(`No approval workflow is configured for the location of invoice ${invoice.InvoiceNumber}.`);
        notices.push({ kind: NOTICE_KINDS.SUMMARY, invoice, recipientUserIds: recipients.map((entry) => entry.UserID), actorName: displayName(user) });
      }
    }
    return notices;
  });

// =====================================================================
//  Read models (My Approvals page, invoice timeline)
// =====================================================================

const TASK_LIST_COLUMNS = `
  t.TaskID, t.InvoiceID, t.StepOrder, t.StepName, t.StepType, t.TaskStatus, t.AssignedAt, t.ActedAt, t.Remarks AS ActionRemarks,
  h.InvoiceNumber, h.InvoiceDate, h.LocationName, h.FromStation, h.ToStation, h.LRNumber, h.SONumber, h.CustomerName, h.ContractType,
  h.TotalInvoiceAmount, h.Remarks, h.UserRemarks, h.ApprovalStatus, h.IsPreApproved, h.Doc1Path, h.Doc2Path, h.Doc3Path,
  h.UploadedDate, v.VendorName, uploader.FullName AS UploadedByName, ver.ExpectedAmount, ver.VerificationStatus`;

const TASK_LIST_JOINS = `
  JOIN InvoiceHeader h ON h.InvoiceID = t.InvoiceID
  LEFT JOIN Vendors v ON v.VendorID = h.VendorID
  LEFT JOIN Users uploader ON uploader.UserID = h.UploadedBy
  OUTER APPLY (
    SELECT TOP 1 iv.ExpectedAmount, iv.VerificationStatus
    FROM InvoiceVerification iv WHERE iv.InvoiceID = h.InvoiceID ORDER BY iv.VerificationID DESC
  ) ver`;

// view "pending": waiting for this user; "history": what this user acted
// on or received for information.
const getMyTasks = ({ user, view }) => {
  const isPending = view !== "history";
  return select(
    `SELECT TOP ${MAX_TASK_LIST_ROWS} ${TASK_LIST_COLUMNS}
     FROM InvoiceApprovalTasks t ${TASK_LIST_JOINS}
     WHERE ${isPending
       ? "t.AssignedUserID = :userId AND t.TaskStatus = :pending"
       : "(t.ActedBy = :userId AND t.TaskStatus IN (:acted)) OR (t.AssignedUserID = :userId AND t.TaskStatus = :notified)"}
     ORDER BY ${isPending ? "t.AssignedAt ASC" : "t.ActedAt DESC"}`,
    {
      userId: user.UserID,
      pending: TASK_STATUS.PENDING,
      notified: TASK_STATUS.NOTIFIED,
      acted: [TASK_STATUS.APPROVED, TASK_STATUS.REJECTED],
    }
  );
};

// True when the user is assigned to any step of any location's workflow;
// only those users (and admins) get the My Approvals page.
const isWorkflowMember = async (userId) => {
  const [row] = await select("SELECT TOP 1 StepUserID FROM ApprovalWorkflowStepUsers WHERE UserID = :userId", { userId });
  return Boolean(row);
};

const getPendingTaskCount = async (user) => {
  const [row] = await select(
    "SELECT COUNT(1) AS PendingCount FROM InvoiceApprovalTasks WHERE AssignedUserID = :userId AND TaskStatus = :pending",
    { userId: user.UserID, pending: TASK_STATUS.PENDING }
  );
  return row?.PendingCount || 0;
};

// Full approval record of one invoice: who entered it, the draft / submit
// / approval dates, every event and every task.
const getInvoiceTimeline = async (invoiceId) => {
  const [invoice] = await select(
    `SELECT h.InvoiceID, h.InvoiceNumber, h.ApprovalStatus, h.CurrentStepOrder, h.UploadedDate, h.DraftCreatedAt,
            h.SubmittedForApprovalAt, h.FinalApprovedAt, h.LocationName,
            uploader.FullName AS UploadedByName, uploader.Email AS UploadedByEmail,
            approver.FullName AS SelectedApproverName, finalApprover.FullName AS FinalApprovedByName
     FROM InvoiceHeader h
     LEFT JOIN Users uploader ON uploader.UserID = h.UploadedBy
     LEFT JOIN Users approver ON approver.UserID = h.SelectedApproverUserID
     LEFT JOIN Users finalApprover ON finalApprover.UserID = h.FinalApprovedBy
     WHERE h.InvoiceID = :invoiceId`,
    { invoiceId }
  );
  if (!invoice) throw httpError("Invoice not found.", 404);

  const events = await select(
    `SELECT e.EventID, e.EventType, e.StepOrder, e.StepName, e.Details, e.EventAt, u.FullName AS ActorName
     FROM InvoiceWorkflowEvents e LEFT JOIN Users u ON u.UserID = e.ActorUserID
     WHERE e.InvoiceID = :invoiceId ORDER BY e.EventAt, e.EventID`,
    { invoiceId }
  );
  const tasks = await select(
    `SELECT t.TaskID, t.StepOrder, t.StepName, t.StepType, t.TaskStatus, t.AssignedAt, t.ActedAt, t.Remarks,
            assigned.FullName AS AssignedName, acted.FullName AS ActedByName
     FROM InvoiceApprovalTasks t
     LEFT JOIN Users assigned ON assigned.UserID = t.AssignedUserID
     LEFT JOIN Users acted ON acted.UserID = t.ActedBy
     WHERE t.InvoiceID = :invoiceId ORDER BY t.AssignedAt, t.TaskID`,
    { invoiceId }
  );
  return { invoice, events, tasks };
};

module.exports = {
  getLocationWorkflow,
  getAllWorkflows,
  saveLocationWorkflow,
  getSelectableApprovers,
  recordInvoiceCreated,
  startWorkflow,
  restartWorkflow,
  actOnInvoice,
  prepareSelectedInvoiceNotices,
  getMyTasks,
  isWorkflowMember,
  getPendingTaskCount,
  getInvoiceTimeline,
};
