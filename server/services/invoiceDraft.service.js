const fs = require("fs");
const path = require("path");
const { literal, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { InvoiceDraft } = require("../models");
const notificationService = require("./notification.service");
const { sendMail } = require("./mailer.service");
const { escapeHtml } = require("./approvalMail.service");
const { CLIENT_URL } = require("../constants/email");
const { NOTIFICATION_TYPE_DRAFT_SHARED } = require("../constants/notificationTypes");
const {
  DRAFT_UPLOADS_DIR,
  MAX_DRAFT_TITLE_LENGTH,
  DRAFT_FILE_FIELD_PREFIX,
  DRAFT_FILE_KEY_PATTERN,
  DRAFT_TYPES,
  MAX_SHARE_COMMENT_LENGTH,
} = require("../constants/invoiceDrafts");
const { normalizeInvoiceType } = require("../constants/contractTypes");

const LIST_ATTRIBUTES = ["DraftID", "Title", "ContractType", "DraftType", "InvoiceCount", "CreatedAt", "UpdatedAt"];

// Page each draft type opens on; the draftId query parameter resumes it.
const DRAFT_PAGE_PATHS = {
  [DRAFT_TYPES.ADD]: "/invoices/add",
  [DRAFT_TYPES.EDIT]: "/invoices/edit",
};

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const notFound = () => httpError("Draft not found.", 404);
const badRequest = (message) => httpError(message, 400);

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

const uniqueIds = (ids) => [...new Set(ids.filter((id) => id != null && id !== "").map(Number))].filter(Number.isInteger);

const parseJson = (text, fallback) => {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch (error) {
    return fallback;
  }
};

const draftDir = (draftId) => path.join(DRAFT_UPLOADS_DIR, String(draftId));

// Validates the multipart "draft" field sent by Add / Edit Invoice.
const parseDraftBody = (body) => {
  const draft = typeof body.draft === "string" ? parseJson(body.draft, null) : body.draft;
  if (!draft || typeof draft.page !== "object" || draft.page === null) {
    throw badRequest("Draft content is missing or invalid.");
  }
  return {
    Title: String(draft.title || "Untitled draft").trim().slice(0, MAX_DRAFT_TITLE_LENGTH),
    ContractType: normalizeInvoiceType(draft.contractType),
    DraftType: draft.draftType === DRAFT_TYPES.EDIT ? DRAFT_TYPES.EDIT : DRAFT_TYPES.ADD,
    InvoiceCount: Math.max(0, parseInt(draft.invoiceCount, 10) || 0),
    Payload: JSON.stringify(draft.page),
  };
};

// Pairs each uploaded file with its key; keys become file names on disk,
// so they are checked before anything is created.
const readDraftFiles = (files = []) =>
  files
    .filter((file) => file.fieldname.startsWith(DRAFT_FILE_FIELD_PREFIX))
    .map((file) => {
      const key = file.fieldname.slice(DRAFT_FILE_FIELD_PREFIX.length);
      if (!DRAFT_FILE_KEY_PATTERN.test(key)) throw badRequest(`Invalid attachment key '${key}'.`);
      return { key, file };
    });

// Writes the attachments into a fresh folder and swaps it in, so a failed
// save never leaves a draft pointing at half-written files.
const replaceDraftFiles = (draftId, draftFiles) => {
  const finalDir = draftDir(draftId);
  const tempDir = `${finalDir}.tmp`;
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const fileIndex = {};
  draftFiles.forEach(({ key, file }) => {
    const storedName = `${key}${path.extname(file.originalname || "").slice(0, 10)}`;
    fs.writeFileSync(path.join(tempDir, storedName), file.buffer);
    fileIndex[key] = { originalName: file.originalname, storedName, mimeType: file.mimetype, size: file.size };
  });

  fs.rmSync(finalDir, { recursive: true, force: true });
  fs.renameSync(tempDir, finalDir);
  return fileIndex;
};

const isSharedWith = async (draftId, userId) => {
  const [share] = await select(
    "SELECT TOP 1 ShareID FROM InvoiceDraftShares WHERE DraftID = :draftId AND UserID = :userId",
    { draftId, userId }
  );
  return Boolean(share);
};

// The owner and every user the draft is shared with can open, edit,
// save and submit it.
const findAccessibleDraft = async (userId, draftId) => {
  const draft = await InvoiceDraft.findByPk(draftId);
  if (!draft) throw notFound();
  if (Number(draft.UserID) !== Number(userId) && !(await isSharedWith(draft.DraftID, userId))) throw notFound();
  return draft;
};

const getShares = (draftIds) => (draftIds.length
  ? select(
    `SELECT s.DraftID, s.UserID, u.FullName, s.Comment, s.SharedAt, sharedBy.FullName AS SharedByName
     FROM InvoiceDraftShares s
     JOIN Users u ON u.UserID = s.UserID
     LEFT JOIN Users sharedBy ON sharedBy.UserID = s.SharedByUserID
     WHERE s.DraftID IN (:draftIds)
     ORDER BY s.SharedAt`,
    { draftIds }
  )
  : []);

// The user's own drafts and the drafts shared with them, newest first.
// Own drafts list who they are shared with; shared drafts carry who
// shared them and the comment.
const listDrafts = async (userId) => {
  const drafts = await select(
    `SELECT d.DraftID, d.Title, d.ContractType, d.DraftType, d.InvoiceCount, d.CreatedAt, d.UpdatedAt,
            d.UserID AS OwnerUserID, owner.FullName AS OwnerName, editor.FullName AS LastEditedByName
     FROM InvoiceDrafts d
     JOIN Users owner ON owner.UserID = d.UserID
     LEFT JOIN Users editor ON editor.UserID = d.LastEditedBy
     WHERE d.UserID = :userId
        OR EXISTS (SELECT 1 FROM InvoiceDraftShares s WHERE s.DraftID = d.DraftID AND s.UserID = :userId)
     ORDER BY COALESCE(d.UpdatedAt, d.CreatedAt) DESC`,
    { userId }
  );
  const shares = await getShares(drafts.map((draft) => draft.DraftID));

  return drafts.map((draft) => {
    const draftShares = shares.filter((share) => share.DraftID === draft.DraftID);
    const isOwner = Number(draft.OwnerUserID) === Number(userId);
    const myShare = draftShares.find((share) => Number(share.UserID) === Number(userId));
    return {
      ...draft,
      IsOwner: isOwner,
      SharedWith: draftShares.map((share) => share.FullName),
      SharedWithMe: isOwner || !myShare
        ? null
        : { SharedByName: myShare.SharedByName, Comment: myShare.Comment, SharedAt: myShare.SharedAt },
    };
  });
};

const getDraft = async (userId, draftId) => {
  const draft = await findAccessibleDraft(userId, draftId);
  return {
    ...LIST_ATTRIBUTES.reduce((result, key) => ({ ...result, [key]: draft[key] }), {}),
    IsOwner: Number(draft.UserID) === Number(userId),
    page: parseJson(draft.Payload, {}),
    files: parseJson(draft.Files, {}),
  };
};

// Creates a draft, or replaces one the user can access when draftId is
// given. A draft keeps its owner and type when someone it is shared with
// saves it.
const saveDraft = async ({ userId, draftId, body, files }) => {
  const values = parseDraftBody(body);
  const draftFiles = readDraftFiles(files);
  const draft = draftId
    ? await findAccessibleDraft(userId, draftId)
    : await InvoiceDraft.create({ ...values, UserID: userId, LastEditedBy: userId, CreatedAt: literal("GETDATE()") });

  const fileIndex = replaceDraftFiles(draft.DraftID, draftFiles);
  const { DraftType, ...updatable } = values;
  await draft.update({
    ...(draftId ? updatable : values),
    Files: JSON.stringify(fileIndex),
    LastEditedBy: userId,
    ...(draftId ? { UpdatedAt: literal("GETDATE()") } : {}),
  });
  return getDraft(userId, draft.DraftID);
};

const deleteDraft = async (userId, draftId) => {
  const draft = await findAccessibleDraft(userId, draftId);
  await draft.destroy();
  fs.rmSync(draftDir(draft.DraftID), { recursive: true, force: true });
};

const getDraftFile = async (userId, draftId, fileKey) => {
  const draft = await findAccessibleDraft(userId, draftId);
  const entry = parseJson(draft.Files, {})[fileKey];
  const fullPath = entry && path.join(draftDir(draft.DraftID), entry.storedName);
  if (!entry || !fs.existsSync(fullPath)) throw notFound();
  return { fullPath, originalName: entry.originalName, mimeType: entry.mimeType };
};

// =====================================================================
//  Sharing
// =====================================================================

// Locations the draft's invoices belong to: the selected hierarchy
// location of an Add Invoice draft, every row's location of an Edit one.
const getDraftLocationIds = (draft) => {
  const page = parseJson(draft.Payload, {});
  return draft.DraftType === DRAFT_TYPES.EDIT
    ? uniqueIds((page.rows || []).map((row) => row.locationId))
    : uniqueIds([page.hierarchy?.locationId]);
};

const ACTIVE_USER_COLUMNS = "u.UserID, u.FullName, u.Email, r.RoleName";

// Users who can open invoices of a location: admins, users granted the
// location (directly or through its plant) and its workflow step users -
// the same scope utils/invoiceAccess.js applies to invoices.
const getUsersWithLocationAccess = (locationId) =>
  select(
    `SELECT ${ACTIVE_USER_COLUMNS}
     FROM Users u LEFT JOIN Roles r ON r.RoleID = u.RoleID
     WHERE u.IsActive = 1 AND (
       LOWER(r.RoleName) = 'admin'
       OR EXISTS (
         SELECT 1 FROM UserLocationPermission p LEFT JOIN Plants pl ON pl.PlantID = p.PlantID
         WHERE p.UserID = u.UserID AND p.CanView = 1 AND (p.LocationID = :locationId OR pl.LocationID = :locationId))
       OR EXISTS (
         SELECT 1 FROM ApprovalWorkflowStepUsers su JOIN ApprovalWorkflowSteps s ON s.StepID = su.StepID
         WHERE su.UserID = u.UserID AND s.LocationID = :locationId))`,
    { locationId }
  );

const getAllActiveUsers = () =>
  select(`SELECT ${ACTIVE_USER_COLUMNS} FROM Users u LEFT JOIN Roles r ON r.RoleID = u.RoleID WHERE u.IsActive = 1`, {});

// Active users with access to every location of the draft, except the
// current user and the owner.
const findShareCandidates = async (draft, userId) => {
  const locationIds = getDraftLocationIds(draft);
  let candidates = locationIds.length ? await getUsersWithLocationAccess(locationIds[0]) : await getAllActiveUsers();
  for (const locationId of locationIds.slice(1)) {
    const allowedIds = new Set((await getUsersWithLocationAccess(locationId)).map((user) => Number(user.UserID)));
    candidates = candidates.filter((user) => allowedIds.has(Number(user.UserID)));
  }
  const excludedIds = new Set([Number(userId), Number(draft.UserID)]);
  return candidates
    .filter((user) => !excludedIds.has(Number(user.UserID)))
    .sort((a, b) => String(a.FullName || "").localeCompare(String(b.FullName || "")));
};

const getShareCandidates = async (userId, draftId) => {
  const draft = await findAccessibleDraft(userId, draftId);
  return findShareCandidates(draft, userId);
};

const upsertShare = ({ draftId, recipientId, sharedByUserId, comment }, transaction) =>
  sequelize.query(
    `MERGE InvoiceDraftShares AS target
     USING (SELECT :draftId AS DraftID, :recipientId AS UserID) AS source
       ON target.DraftID = source.DraftID AND target.UserID = source.UserID
     WHEN MATCHED THEN UPDATE SET SharedByUserID = :sharedByUserId, Comment = :comment, SharedAt = GETDATE()
     WHEN NOT MATCHED THEN INSERT (DraftID, UserID, SharedByUserID, Comment) VALUES (:draftId, :recipientId, :sharedByUserId, :comment);`,
    { replacements: { draftId, recipientId, sharedByUserId, comment }, transaction }
  );

const buildShareMailHtml = ({ draft, sharedByName, comment }) => {
  const draftLink = `${CLIENT_URL}${DRAFT_PAGE_PATHS[draft.DraftType] || DRAFT_PAGE_PATHS[DRAFT_TYPES.ADD]}?draftId=${draft.DraftID}`;
  const action = draft.DraftType === DRAFT_TYPES.EDIT ? "changes to existing invoice(s)" : "new invoice(s)";
  return `
  <div style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;">
    <h3 style="color:#1a365d;margin-bottom:8px;">Invoice draft shared with you</h3>
    <p><strong>${escapeHtml(sharedByName)}</strong> shared a draft of ${action} with you: <strong>${escapeHtml(draft.Title)}</strong>.</p>
    ${comment ? `<p style="background:#f3f4f6;border-left:3px solid #2563eb;padding:8px 12px;">${escapeHtml(comment)}</p>` : ""}
    <p>You can open the draft, edit it, save it again or submit it.</p>
    <p style="margin-top:16px;">
      <a href="${draftLink}" style="background:#2563eb;color:#fff;text-decoration:none;padding:8px 18px;border-radius:6px;display:inline-block;">Open the draft</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;">Freight Contract Management System Automation</p>
  </div>`;
};

// Mails each recipient; returns the failures instead of throwing, because
// the share itself is already saved.
const mailShareRecipients = async ({ recipients, draft, sharedByName, comment }) => {
  const failures = [];
  for (const recipient of recipients.filter((user) => user.Email)) {
    try {
      await sendMail({
        to: recipient.Email,
        subject: `Invoice draft shared with you - ${draft.Title}`,
        html: buildShareMailHtml({ draft, sharedByName, comment }),
      });
    } catch (error) {
      console.error("Draft share mail failed:", error);
      failures.push(`${recipient.Email}: ${error.message}`);
    }
  }
  return failures;
};

/**
 * Shares a draft with other users: they can then open, edit, save and
 * submit it. Each of them gets an in-app notification and a mail with the
 * comment.
 *
 * @returns {Promise<{ sharedWith: string[], mailFailures: string[] }>}
 */
const shareDraft = async ({ user, draftId, userIds, comment }) => {
  const draft = await findAccessibleDraft(user.UserID, draftId);
  const requestedIds = uniqueIds(Array.isArray(userIds) ? userIds : []);
  if (!requestedIds.length) throw badRequest("Select at least one user to share the draft with.");

  const candidates = await findShareCandidates(draft, user.UserID);
  const recipients = candidates.filter((candidate) => requestedIds.includes(Number(candidate.UserID)));
  if (recipients.length !== requestedIds.length) {
    throw badRequest("One or more selected users are inactive or cannot access the location of this draft.");
  }

  const cleanComment = String(comment || "").trim().slice(0, MAX_SHARE_COMMENT_LENGTH) || null;
  const sharedByName = user.FullName || user.Email || `User #${user.UserID}`;
  await sequelize.transaction(async (transaction) => {
    for (const recipient of recipients) {
      await upsertShare({ draftId: draft.DraftID, recipientId: recipient.UserID, sharedByUserId: user.UserID, comment: cleanComment }, transaction);
    }
    await notificationService.notify({
      type: NOTIFICATION_TYPE_DRAFT_SHARED,
      userIds: recipients.map((recipient) => recipient.UserID),
      message: `${sharedByName} shared the draft "${draft.Title}" with you${cleanComment ? `: ${cleanComment}` : "."}`,
    }, transaction);
  });

  const mailFailures = await mailShareRecipients({ recipients, draft, sharedByName, comment: cleanComment });
  return { sharedWith: recipients.map((recipient) => recipient.FullName), mailFailures };
};

module.exports = {
  listDrafts,
  getDraft,
  saveDraft,
  deleteDraft,
  getDraftFile,
  getShareCandidates,
  shareDraft,
};
