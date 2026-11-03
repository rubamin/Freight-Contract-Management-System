const fs = require("fs");
const path = require("path");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const notificationService = require("./notification.service");
const { sendMasterRequestMail } = require("./masterApprovalMail.service");
const { getMasterChangeExecutor, readSheetRows } = require("./masterChangeExecutors");
const { isAdminRole } = require("../constants/roles");
const {
  MASTER_APPROVAL_MODULE_KEYS,
  MASTER_ACTIONS,
  MASTER_ACTION_LABELS,
  MASTER_REQUEST_OPERATIONS,
  MASTER_REQUEST_STATUS,
  MASTER_REQUEST_VIEWS,
  MASTER_REQUEST_DECISIONS,
  MASTER_REQUEST_UPLOAD_DIR,
  MAX_MASTER_REQUEST_REMARKS_LENGTH,
  MAX_MASTER_REQUEST_LABEL_LENGTH,
  MAX_MASTER_REQUEST_LIST_ROWS,
  getMasterLabel,
} = require("../constants/masterApproval");
const {
  NOTIFICATION_TYPE_MASTER_APPROVAL_REQUIRED,
  NOTIFICATION_TYPE_MASTER_REQUEST_APPROVED,
  NOTIFICATION_TYPE_MASTER_REQUEST_REJECTED,
} = require("../constants/notificationTypes");

const UPLOAD_ROOT = path.resolve(__dirname, "..", MASTER_REQUEST_UPLOAD_DIR);

const EXCEL_MIME_TYPES = {
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const select = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });

const execute = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, transaction });

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const uniqueIds = (ids) => [...new Set((ids || []).filter((id) => id != null && id !== "").map(Number))];

const displayName = (user) => user?.FullName || user?.Email || `User #${user?.UserID}`;

const isAdmin = (user) => isAdminRole(user?.RoleName);

const describeRequest = (request) =>
  `${MASTER_ACTION_LABELS[request.ActionType]} ${getMasterLabel(request.ModuleKey)}${request.RecordLabel ? `: ${request.RecordLabel}` : ""}`;

const parseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const limitText = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength) || null;

// =====================================================================
//  Settings (Master Approval Workflow page, Admin only)
// =====================================================================

const APPROVER_COLUMNS = "a.ModuleKey, a.ActionType, u.UserID, u.FullName, u.Email, u.IsActive, r.RoleName";

const getAllApprovers = (transaction) =>
  select(
    `SELECT ${APPROVER_COLUMNS}
     FROM MasterApprovalApprovers a
     JOIN Users u ON u.UserID = a.UserID
     LEFT JOIN Roles r ON r.RoleID = u.RoleID
     ORDER BY u.FullName`,
    {},
    transaction
  );

const toApproverList = (approvers, moduleKey, actionType) =>
  approvers
    .filter((row) => row.ModuleKey === moduleKey && row.ActionType === actionType)
    .map(({ ModuleKey, ActionType, ...user }) => ({ ...user, IsActive: Boolean(user.IsActive) }));

const getSettings = async () => {
  const settings = await select("SELECT * FROM MasterApprovalSettings", {});
  const approvers = await getAllApprovers();

  return MASTER_APPROVAL_MODULE_KEYS.map((moduleKey) => {
    const row = settings.find((setting) => setting.ModuleKey === moduleKey);
    return {
      moduleKey,
      label: getMasterLabel(moduleKey),
      addEnabled: Boolean(row?.AddEnabled),
      editEnabled: Boolean(row?.EditEnabled),
      sameApprovers: row ? Boolean(row.SameApprovers) : true,
      addApprovers: toApproverList(approvers, moduleKey, MASTER_ACTIONS.ADD),
      editApprovers: toApproverList(approvers, moduleKey, MASTER_ACTIONS.EDIT),
      updatedAt: row?.UpdatedAt || null,
    };
  });
};

const getActiveUsers = () =>
  select(
    `SELECT u.UserID, u.FullName, u.Email, r.RoleName
     FROM Users u
     LEFT JOIN Roles r ON r.RoleID = u.RoleID
     WHERE u.IsActive = 1
     ORDER BY u.FullName`,
    {}
  );

const getSettingsPage = async () => ({
  modules: await getSettings(),
  users: await getActiveUsers(),
});

const normalizeModuleSetting = (input) => {
  const sameApprovers = Boolean(input.sameApprovers);
  const addApproverIds = uniqueIds(input.addApproverIds);
  return {
    moduleKey: input.moduleKey,
    addEnabled: Boolean(input.addEnabled),
    editEnabled: Boolean(input.editEnabled),
    sameApprovers,
    addApproverIds,
    editApproverIds: sameApprovers ? addApproverIds : uniqueIds(input.editApproverIds),
  };
};

const assertValidSetting = (setting) => {
  const label = getMasterLabel(setting.moduleKey);
  if (!MASTER_APPROVAL_MODULE_KEYS.includes(setting.moduleKey)) {
    throw httpError(`"${setting.moduleKey}" does not support approval.`);
  }
  if (setting.addEnabled && !setting.addApproverIds.length) {
    throw httpError(`${label}: choose at least one approver for Add.`);
  }
  if (setting.editEnabled && !setting.editApproverIds.length) {
    throw httpError(`${label}: choose at least one approver for Edit.`);
  }
};

const assertActiveApprovers = async (settings) => {
  const ids = uniqueIds(settings.flatMap((setting) => [...setting.addApproverIds, ...setting.editApproverIds]));
  if (!ids.length) return;
  const users = await select("SELECT UserID FROM Users WHERE UserID IN (:ids) AND IsActive = 1", { ids });
  if (users.length !== ids.length) {
    throw httpError("Every approver must be an active user.");
  }
};

const insertApprovers = async (moduleKey, actionType, userIds, transaction) => {
  for (const userId of userIds) {
    await execute(
      "INSERT INTO MasterApprovalApprovers (ModuleKey, ActionType, UserID) VALUES (:moduleKey, :actionType, :userId)",
      { moduleKey, actionType, userId },
      transaction
    );
  }
};

const replaceModuleSetting = async (setting, adminUserId, transaction) => {
  const { moduleKey } = setting;
  await execute("DELETE FROM MasterApprovalApprovers WHERE ModuleKey = :moduleKey", { moduleKey }, transaction);
  await execute("DELETE FROM MasterApprovalSettings WHERE ModuleKey = :moduleKey", { moduleKey }, transaction);
  await execute(
    `INSERT INTO MasterApprovalSettings (ModuleKey, AddEnabled, EditEnabled, SameApprovers, UpdatedAt, UpdatedBy)
     VALUES (:moduleKey, :addEnabled, :editEnabled, :sameApprovers, GETDATE(), :adminUserId)`,
    {
      moduleKey,
      addEnabled: setting.addEnabled ? 1 : 0,
      editEnabled: setting.editEnabled ? 1 : 0,
      sameApprovers: setting.sameApprovers ? 1 : 0,
      adminUserId,
    },
    transaction
  );
  await insertApprovers(moduleKey, MASTER_ACTIONS.ADD, setting.addApproverIds, transaction);
  await insertApprovers(moduleKey, MASTER_ACTIONS.EDIT, setting.editApproverIds, transaction);
};

// Saves the settings of every master sent. Requests already waiting keep
// their state; they can be approved by the approvers saved here.
const saveSettings = async (modules, adminUserId) => {
  if (!Array.isArray(modules) || !modules.length) {
    throw httpError("No master settings were sent.");
  }
  const settings = modules.map(normalizeModuleSetting);
  settings.forEach(assertValidSetting);
  await assertActiveApprovers(settings);

  await sequelize.transaction(async (transaction) => {
    for (const setting of settings) {
      await replaceModuleSetting(setting, adminUserId, transaction);
    }
  });

  return getSettings();
};

// =====================================================================
//  Who approves
// =====================================================================

const getActiveApproverIds = async (moduleKey, actionType, transaction) => {
  const rows = await select(
    `SELECT a.UserID
     FROM MasterApprovalApprovers a
     JOIN Users u ON u.UserID = a.UserID AND u.IsActive = 1
     WHERE a.ModuleKey = :moduleKey AND a.ActionType = :actionType`,
    { moduleKey, actionType },
    transaction
  );
  return rows.map(({ UserID }) => Number(UserID));
};

const isActionEnabled = async (moduleKey, actionType) => {
  const [setting] = await select("SELECT AddEnabled, EditEnabled FROM MasterApprovalSettings WHERE ModuleKey = :moduleKey", { moduleKey });
  if (!setting) return false;
  return Boolean(actionType === MASTER_ACTIONS.ADD ? setting.AddEnabled : setting.EditEnabled);
};

// Approvers who would receive this user's change, or an empty list when it
// saves directly: the action has no approval, the user is an Admin, or the
// user is the only approver.
const getApproversForChange = async (moduleKey, actionType, user) => {
  if (!moduleKey || !MASTER_APPROVAL_MODULE_KEYS.includes(moduleKey) || isAdmin(user)) return [];
  if (!(await isActionEnabled(moduleKey, actionType))) return [];
  const approverIds = await getActiveApproverIds(moduleKey, actionType);
  return approverIds.filter((id) => id !== Number(user.UserID));
};

const isMasterApprover = async (userId) => {
  const rows = await select("SELECT TOP 1 1 AS Found FROM MasterApprovalApprovers WHERE UserID = :userId", { userId });
  return rows.length > 0;
};

const isApproverFor = async (userId, moduleKey, actionType, transaction) => {
  const approverIds = await getActiveApproverIds(moduleKey, actionType, transaction);
  return approverIds.includes(Number(userId));
};

const canActOn = async (user, request, transaction) => {
  if (isAdmin(user)) return true;
  if (Number(request.RequestedBy) === Number(user.UserID)) return false;
  return isApproverFor(user.UserID, request.ModuleKey, request.ActionType, transaction);
};

// =====================================================================
//  Submitting a change
// =====================================================================

const readFileBuffer = (file) => file.buffer || fs.readFileSync(file.path);

const removeTempUpload = (file) => {
  if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
};

const assertNoPendingEdit = async (moduleKey, recordId) => {
  const [pending] = await select(
    `SELECT TOP 1 RequestID FROM MasterChangeRequests
     WHERE ModuleKey = :moduleKey AND RecordID = :recordId AND ActionType = :actionType AND Status = :status`,
    { moduleKey, recordId, actionType: MASTER_ACTIONS.EDIT, status: MASTER_REQUEST_STATUS.PENDING }
  );
  if (pending) {
    throw httpError(`A change to this record is already waiting for approval (Request #${pending.RequestID}). Wait for it to be approved or rejected.`, 409);
  }
};

const insertRequest = async (fields) => {
  const [inserted] = await select(
    `INSERT INTO MasterChangeRequests
       (ModuleKey, ActionType, Operation, RecordID, RecordLabel, Payload, OldData, Status, RequestedBy, RequestedAt)
     OUTPUT INSERTED.RequestID
     VALUES (:moduleKey, :actionType, :operation, :recordId, :recordLabel, :payload, :oldData, :status, :requestedBy, GETDATE())`,
    fields
  );
  return Number(inserted.RequestID);
};

const sanitizeFileName = (name) => path.basename(String(name || "file")).replace(/[^\w.\- ]/g, "_");

const storeRequestFile = async (requestId, file) => {
  const fileName = sanitizeFileName(file.originalname);
  const directory = path.join(UPLOAD_ROOT, String(requestId));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, fileName), readFileBuffer(file));
  await execute(
    "UPDATE MasterChangeRequests SET FileName = :fileName, FilePath = :filePath WHERE RequestID = :requestId",
    { fileName: file.originalname, filePath: path.join(String(requestId), fileName), requestId }
  );
};

const removeRequestFiles = (requestId) => {
  const directory = path.join(UPLOAD_ROOT, String(requestId));
  if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
};

const buildBulkPayload = (file) => {
  if (!file) throw httpError("No file uploaded. Please upload a valid Excel/CSV spreadsheet.");
  const rows = readSheetRows(readFileBuffer(file));
  if (!rows.length) throw httpError("The uploaded spreadsheet contains no data rows.");
  return rows;
};

const buildRecordLabel = async ({ executor, operation, payload, oldData, file }) => {
  if (operation === MASTER_REQUEST_OPERATIONS.BULK) {
    return `Bulk upload: ${payload.length} row(s) from ${file.originalname}`;
  }
  return executor.buildLabel({ ...(oldData || {}), ...payload });
};

const notifyApprovers = async (request, requester, approverIds) => {
  const summary = describeRequest(request);
  await notificationService.notify({
    type: NOTIFICATION_TYPE_MASTER_APPROVAL_REQUIRED,
    message: `${displayName(requester)} sent a change for your approval - ${summary}.`.slice(0, 500),
    userIds: approverIds,
  });
  await sendMasterRequestMail({
    userIds: approverIds,
    subject: `Approval required: ${MASTER_ACTION_LABELS[request.ActionType]} ${getMasterLabel(request.ModuleKey)}`,
    heading: "Master change waiting for your approval",
    intro: `<strong>${displayName(requester)}</strong> sent the change below for your approval. It is saved only after it is approved.`,
    rows: [
      ["Request #", request.RequestID],
      ["Master", getMasterLabel(request.ModuleKey)],
      ["Action", MASTER_ACTION_LABELS[request.ActionType]],
      ["Record", request.RecordLabel || "-"],
      ["Requested by", displayName(requester)],
    ],
  });
};

// Holds an Add / Edit / bulk upload for approval instead of saving it.
const submitRequest = async ({ moduleKey, actionType, operation, recordId, payload, file, user, approverIds }) => {
  try {
    const executor = getMasterChangeExecutor(moduleKey);
    let oldData = null;

    if (actionType === MASTER_ACTIONS.EDIT) {
      oldData = await executor.findRecord(recordId);
      if (!oldData) throw httpError("Record not found.", 404);
      await assertNoPendingEdit(moduleKey, recordId);
    }

    const requestPayload = operation === MASTER_REQUEST_OPERATIONS.BULK ? buildBulkPayload(file) : payload || {};
    const recordLabel = await buildRecordLabel({ executor, operation, payload: requestPayload, oldData, file });

    const request = {
      ModuleKey: moduleKey,
      ActionType: actionType,
      RecordLabel: limitText(recordLabel, MAX_MASTER_REQUEST_LABEL_LENGTH),
    };
    request.RequestID = await insertRequest({
      moduleKey,
      actionType,
      operation,
      recordId: actionType === MASTER_ACTIONS.EDIT ? Number(recordId) : null,
      recordLabel: request.RecordLabel,
      payload: JSON.stringify(requestPayload),
      oldData: oldData ? JSON.stringify(oldData) : null,
      status: MASTER_REQUEST_STATUS.PENDING,
      requestedBy: user.UserID,
    });

    if (file && operation === MASTER_REQUEST_OPERATIONS.SINGLE) {
      await storeRequestFile(request.RequestID, file);
    }

    await notifyApprovers(request, user, approverIds);

    const approverRows = await select("SELECT FullName, Email FROM Users WHERE UserID IN (:ids)", { ids: approverIds });
    return {
      requestId: request.RequestID,
      approvers: approverRows.map((row) => row.FullName || row.Email),
    };
  } finally {
    removeTempUpload(file);
  }
};

// =====================================================================
//  Request lists
// =====================================================================

const LIST_COLUMNS = `
  r.RequestID, r.ModuleKey, r.ActionType, r.Operation, r.RecordID, r.RecordLabel, r.FileName,
  r.Status, r.RequestedBy, r.RequestedAt, r.ActedBy, r.ActedAt, r.ActionRemarks,
  r.ResultRecordID, r.ResultMessage,
  rq.FullName AS RequestedByName, rq.Email AS RequestedByEmail,
  ac.FullName AS ActedByName`;

const LIST_JOINS = `
  FROM MasterChangeRequests r
  JOIN Users rq ON rq.UserID = r.RequestedBy
  LEFT JOIN Users ac ON ac.UserID = r.ActedBy`;

// Pending requests this user can approve (every pending request for an Admin).
const WAITING_FILTER = `
  r.Status = :pending
  AND (:isAdmin = 1 OR (
    r.RequestedBy <> :userId
    AND EXISTS (SELECT 1 FROM MasterApprovalApprovers a
                WHERE a.UserID = :userId AND a.ModuleKey = r.ModuleKey AND a.ActionType = r.ActionType)
  ))`;

const VIEW_FILTERS = {
  [MASTER_REQUEST_VIEWS.WAITING]: WAITING_FILTER,
  [MASTER_REQUEST_VIEWS.MINE]: "r.RequestedBy = :userId",
  [MASTER_REQUEST_VIEWS.ALL]: "1 = 1",
};

const viewReplacements = (user) => ({
  userId: user.UserID,
  isAdmin: isAdmin(user) ? 1 : 0,
  pending: MASTER_REQUEST_STATUS.PENDING,
});

const listRequests = async ({ user, view }) => {
  const filter = VIEW_FILTERS[view] || VIEW_FILTERS[MASTER_REQUEST_VIEWS.WAITING];
  if (view === MASTER_REQUEST_VIEWS.ALL && !isAdmin(user)) {
    throw httpError("Only an administrator can see every request.", 403);
  }
  return select(
    `SELECT TOP ${MAX_MASTER_REQUEST_LIST_ROWS} ${LIST_COLUMNS} ${LIST_JOINS}
     WHERE ${filter}
     ORDER BY r.RequestedAt DESC`,
    viewReplacements(user)
  );
};

const getSummary = async (user) => {
  const [counts] = await select(
    `SELECT
       (SELECT COUNT(*) FROM MasterChangeRequests r WHERE ${WAITING_FILTER}) AS WaitingForMe,
       (SELECT COUNT(*) FROM MasterChangeRequests r WHERE r.RequestedBy = :userId AND r.Status = :pending) AS MyPending,
       (SELECT COUNT(*) FROM MasterChangeRequests r WHERE r.RequestedBy = :userId AND r.Status = :approved) AS MyApproved,
       (SELECT COUNT(*) FROM MasterChangeRequests r WHERE r.RequestedBy = :userId AND r.Status = :rejected) AS MyRejected`,
    {
      ...viewReplacements(user),
      approved: MASTER_REQUEST_STATUS.APPROVED,
      rejected: MASTER_REQUEST_STATUS.REJECTED,
    }
  );
  return {
    waitingForMe: Number(counts.WaitingForMe || 0),
    myPending: Number(counts.MyPending || 0),
    myApproved: Number(counts.MyApproved || 0),
    myRejected: Number(counts.MyRejected || 0),
  };
};

const loadRequest = async (requestId, transaction) => {
  const [request] = await select(
    `SELECT ${LIST_COLUMNS}, r.Payload, r.OldData, r.FilePath ${LIST_JOINS} WHERE r.RequestID = :requestId`,
    { requestId },
    transaction
  );
  if (!request) throw httpError("Request not found.", 404);
  return request;
};

const assertCanSee = async (user, request) => {
  if (isAdmin(user) || Number(request.RequestedBy) === Number(user.UserID)) return;
  if (await isApproverFor(user.UserID, request.ModuleKey, request.ActionType)) return;
  throw httpError("You do not have access to this request.", 403);
};

const getApproverNames = async (request) => {
  const ids = await getActiveApproverIds(request.ModuleKey, request.ActionType);
  if (!ids.length) return [];
  const rows = await select("SELECT FullName, Email FROM Users WHERE UserID IN (:ids) ORDER BY FullName", { ids });
  return rows.map((row) => row.FullName || row.Email);
};

const getRequest = async (requestId, user) => {
  const request = await loadRequest(requestId);
  await assertCanSee(user, request);
  const isPending = request.Status === MASTER_REQUEST_STATUS.PENDING;
  const { Payload, OldData, FilePath, ...rest } = request;
  return {
    ...rest,
    payload: parseJson(Payload),
    oldData: parseJson(OldData),
    hasFile: Boolean(FilePath),
    approvers: await getApproverNames(request),
    canAct: isPending && (await canActOn(user, request)),
    canCancel: isPending && Number(request.RequestedBy) === Number(user.UserID),
  };
};

const getRequestFile = async (requestId, user) => {
  const request = await loadRequest(requestId);
  await assertCanSee(user, request);
  if (!request.FilePath) throw httpError("This request has no file.", 404);
  const absolutePath = path.resolve(UPLOAD_ROOT, request.FilePath);
  if (!absolutePath.startsWith(`${UPLOAD_ROOT}${path.sep}`) || !fs.existsSync(absolutePath)) {
    throw httpError("The file of this request is no longer available.", 404);
  }
  return { absolutePath, fileName: request.FileName || path.basename(absolutePath) };
};

// =====================================================================
//  Approve / reject / cancel
// =====================================================================

const loadActingUser = async (userId) => {
  const [user] = await select(
    `SELECT u.UserID, u.RoleID, u.Email, u.FullName, r.RoleName
     FROM Users u LEFT JOIN Roles r ON r.RoleID = u.RoleID
     WHERE u.UserID = :userId`,
    { userId }
  );
  if (!user) throw httpError("The user who requested this change no longer exists.");
  return user;
};

const loadStoredFile = (request) => {
  if (!request.FilePath) return null;
  const absolutePath = path.resolve(UPLOAD_ROOT, request.FilePath);
  if (!fs.existsSync(absolutePath)) {
    throw httpError("The file attached to this request is no longer available. Reject it and ask for it to be sent again.");
  }
  const buffer = fs.readFileSync(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  return {
    originalname: request.FileName || path.basename(absolutePath),
    buffer,
    size: buffer.length,
    mimetype: EXCEL_MIME_TYPES[extension] || "application/octet-stream",
  };
};

// Runs the requested change exactly as its route would have, as the requester.
const applyRequest = async (request, ip) => {
  const executor = getMasterChangeExecutor(request.ModuleKey);
  const requester = await loadActingUser(request.RequestedBy);
  const context = { user: requester, req: { user: requester, ip }, file: loadStoredFile(request) };
  const payload = parseJson(request.Payload);

  if (request.Operation === MASTER_REQUEST_OPERATIONS.BULK) return executor.bulk(payload || [], context);
  if (request.ActionType === MASTER_ACTIONS.EDIT) return executor.update(request.RecordID, payload || {}, context);
  return executor.create(payload || {}, context);
};

// Marks the request decided only if it is still pending, so two approvers
// acting at the same moment cannot both apply it.
const claimRequest = async ({ requestId, status, userId, remarks }) => {
  const rows = await select(
    `UPDATE MasterChangeRequests
     SET Status = :status, ActedBy = :userId, ActedAt = GETDATE(), ActionRemarks = :remarks
     OUTPUT INSERTED.RequestID
     WHERE RequestID = :requestId AND Status = :pending`,
    { status, userId, remarks, requestId, pending: MASTER_REQUEST_STATUS.PENDING }
  );
  if (!rows.length) throw httpError("This request was already decided by someone else.", 409);
};

const releaseClaim = (requestId) =>
  execute(
    `UPDATE MasterChangeRequests
     SET Status = :pending, ActedBy = NULL, ActedAt = NULL, ActionRemarks = NULL
     WHERE RequestID = :requestId`,
    { requestId, pending: MASTER_REQUEST_STATUS.PENDING }
  );

const saveResult = (requestId, result) =>
  execute(
    "UPDATE MasterChangeRequests SET ResultRecordID = :recordId, ResultMessage = :message WHERE RequestID = :requestId",
    { requestId, recordId: result?.recordId || null, message: limitText(result?.message, MAX_MASTER_REQUEST_REMARKS_LENGTH) }
  );

const notifyRequester = async (request, user, decision, remarks) => {
  const isApproved = decision === MASTER_REQUEST_DECISIONS.APPROVE;
  const summary = describeRequest(request);
  await notificationService.notify({
    type: isApproved ? NOTIFICATION_TYPE_MASTER_REQUEST_APPROVED : NOTIFICATION_TYPE_MASTER_REQUEST_REJECTED,
    message: `${displayName(user)} ${isApproved ? "approved" : "rejected"} your change - ${summary}.${!isApproved && remarks ? ` Reason: ${remarks}` : ""}`.slice(0, 500),
    userIds: [request.RequestedBy],
  });
  await sendMasterRequestMail({
    userIds: [request.RequestedBy],
    subject: `Your master change was ${isApproved ? "approved" : "rejected"}`,
    heading: `Master change ${isApproved ? "approved" : "rejected"}`,
    intro: `<strong>${displayName(user)}</strong> ${isApproved ? "approved your change. It is now saved." : "rejected your change. Nothing was saved."}`,
    rows: [
      ["Request #", request.RequestID],
      ["Master", getMasterLabel(request.ModuleKey)],
      ["Action", MASTER_ACTION_LABELS[request.ActionType]],
      ["Record", request.RecordLabel || "-"],
      [isApproved ? "Remarks" : "Reason", remarks || "-"],
    ],
  });
};

const approve = async (request, user, remarks, ip) => {
  await claimRequest({ requestId: request.RequestID, status: MASTER_REQUEST_STATUS.APPROVED, userId: user.UserID, remarks });
  let result;
  try {
    result = await applyRequest(request, ip);
  } catch (error) {
    await releaseClaim(request.RequestID);
    throw httpError(`The change could not be saved: ${error.message} It is still pending - reject it with this reason so it can be corrected.`);
  }
  await saveResult(request.RequestID, result);
  removeRequestFiles(request.RequestID);
  return result;
};

const actOnRequest = async ({ requestId, user, decision, remarks, ip }) => {
  if (!Object.values(MASTER_REQUEST_DECISIONS).includes(decision)) throw httpError("Invalid decision.");
  const cleanRemarks = limitText(remarks, MAX_MASTER_REQUEST_REMARKS_LENGTH);
  const request = await loadRequest(requestId);
  if (request.Status !== MASTER_REQUEST_STATUS.PENDING) throw httpError("This request was already decided.", 409);
  if (!(await canActOn(user, request))) throw httpError("You cannot approve or reject this request.", 403);

  let resultMessage = "";
  if (decision === MASTER_REQUEST_DECISIONS.REJECT) {
    if (!cleanRemarks) throw httpError("Enter the reason for rejecting.");
    await claimRequest({ requestId, status: MASTER_REQUEST_STATUS.REJECTED, userId: user.UserID, remarks: cleanRemarks });
    removeRequestFiles(requestId);
  } else {
    resultMessage = (await approve(request, user, cleanRemarks, ip))?.message || "";
  }

  await notifyRequester(request, user, decision, cleanRemarks);
  const verb = decision === MASTER_REQUEST_DECISIONS.APPROVE ? "approved and saved" : "rejected";
  return { message: `Request #${requestId} ${verb}. ${resultMessage}`.trim() };
};

const cancelRequest = async ({ requestId, user }) => {
  const request = await loadRequest(requestId);
  if (Number(request.RequestedBy) !== Number(user.UserID)) throw httpError("Only the requester can cancel a request.", 403);
  if (request.Status !== MASTER_REQUEST_STATUS.PENDING) throw httpError("Only a pending request can be cancelled.", 409);
  await claimRequest({ requestId, status: MASTER_REQUEST_STATUS.CANCELLED, userId: user.UserID, remarks: "Cancelled by the requester." });
  removeRequestFiles(requestId);
  return { message: `Request #${requestId} cancelled.` };
};

module.exports = {
  getSettings,
  getSettingsPage,
  saveSettings,
  getApproversForChange,
  isMasterApprover,
  submitRequest,
  listRequests,
  getSummary,
  getRequest,
  getRequestFile,
  actOnRequest,
  cancelRequest,
};
