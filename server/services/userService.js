const { Op, QueryTypes, literal } = require("sequelize");
const sequelize = require("../config/database");
const {
  User,
  Role,
  UserPreference,
  Plant,
  PlantLocation,
  UserLocationPermission,
} = require("../models");
const { comparePassword, hashPassword } = require("../helpers/bcrpt");
const { sanitizeUser } = require("../utils/userSanitizer");
const { USER_CHILD_TABLES } = require("../constants/databaseMaintenance");
const { isForeignKeyReferenceError } = require("../utils/dbErrorHelper");
const { writeAuditLog } = require("./crud.service");
const { HttpError } = require("../utils/httpError");
const { generateTempPassword } = require("../helpers/password");
const { buildSession } = require("./session.service");
const { recordAuthEvent } = require("./authAudit.service");
const { saveOwnPassword } = require("./authService");
const { assertNewPasswordAllowed, replacePassword } = require("./password.service");
const { sendNewAccountEmail, sendAdminResetEmail } = require("./authMail.service");
const { AUTH_AUDIT_ACTIONS } = require("../constants/password");

const USER_IN_USE_MESSAGE =
  "This user is still referenced by contracts, invoices, verifications or approval settings, so they cannot be permanently deleted. Deactivate the user instead.";

const updateProfile = async (userId, { FullName, Email, MobileNo }, photoFile) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: "role" }],
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (Email && Email !== user.Email) {
    const existingEmailUser = await User.findOne({ where: { Email } });
    if (existingEmailUser && existingEmailUser.UserID !== user.UserID) {
      throw new Error("This email address is already in use.");
    }
    user.Email = Email;
  }

  if (FullName !== undefined) {
    user.FullName = FullName;
  }

  if (MobileNo !== undefined) {
    user.MobileNo = MobileNo;
  }

  if (photoFile) {
    user.ProfilePhotoUrl = `uploads/${photoFile.filename}`;
  }

  await user.save();

  return sanitizeUser(user);
};

// Signed in: current password + new password. Returns a new session,
// because the change ends every older session (this one included).
const changePassword = async (userId, { currentPassword, newPassword }, { ip }) => {
  const user = await User.findByPk(userId, { include: [{ model: Role, as: "role" }] });

  if (!user || !user.PasswordHash) {
    throw new HttpError(404, "User not found.");
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, user.PasswordHash);
  if (!isCurrentPasswordValid) {
    throw new HttpError(400, "Current password is incorrect.");
  }

  await assertNewPasswordAllowed(user, newPassword);
  await saveOwnPassword(user, newPassword, { ip, actionType: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGED });
  return buildSession(user);
};

const DEFAULT_PREFERENCES = {
  NotificationEmailEnabled: true,
  NotificationSoundEnabled: true,
  DefaultPlantID: null,
};

const getPreferences = async (userId) => {
  const [preferences] = await UserPreference.findOrCreate({
    where: { UserID: userId },
    defaults: { UserID: userId, ...DEFAULT_PREFERENCES },
    include: [{ model: Plant, as: "defaultPlant" }],
  });

  // findOrCreate's include only applies on the SELECT branch reliably across
  // dialects, so re-fetch with the association to guarantee defaultPlant is present.
  const fullPreferences = await UserPreference.findByPk(preferences.UserID, {
    include: [{ model: Plant, as: "defaultPlant" }],
  });

  // Bug fix (task item 5): this dropdown previously had no options because
  // nothing ever populated it with the plants the user is actually allowed
  // to pick from. Only locations with an admin-granted UserLocationPermission
  // row are offered, and are returned alongside the preference record so the
  // frontend can render the multi-select checkbox list directly.
  const permittedPlants = await UserLocationPermission.findAll({
    where: { UserID: userId, CanView: true, PlantID: { [Op.ne]: null } },
    include: [{ model: Plant, as: "plant" }],
  });
  const permittedHierarchyLocations = await UserLocationPermission.findAll({
    where: { UserID: userId, CanView: true, LocationID: { [Op.ne]: null } },
    include: [{ model: PlantLocation, as: "location" }],
  });

  return {
    ...fullPreferences.toJSON(),
    defaultPlantIds: parseDefaultPlantIds(fullPreferences.DefaultPlantIDs),
    permittedPlants: permittedPlants.map((permission) => permission.plant).filter(Boolean),
    // Each location with what the user may do with its invoices.
    permittedHierarchyLocations: permittedHierarchyLocations
      .filter((permission) => permission.location)
      .map((permission) => ({
        ...permission.location.toJSON(),
        CanView: Boolean(permission.CanView),
        CanAdd: Boolean(permission.CanAdd),
        CanEdit: Boolean(permission.CanEdit),
      })),
  };
};

const parseDefaultPlantIds = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
};

const updatePreferences = async (userId, { notificationEmailEnabled, notificationSoundEnabled, defaultPlantIds }) => {
  const [preferences] = await UserPreference.findOrCreate({
    where: { UserID: userId },
    defaults: { UserID: userId, ...DEFAULT_PREFERENCES },
  });

  if (notificationEmailEnabled !== undefined) {
    preferences.NotificationEmailEnabled = notificationEmailEnabled;
  }

  if (notificationSoundEnabled !== undefined) {
    preferences.NotificationSoundEnabled = notificationSoundEnabled;
  }

  if (defaultPlantIds !== undefined) {
    // Only plants the user has an admin-granted permission for may be
    // selected, even if the client sends something else (task item 5:
    // "if the user needs a location that isn't in their permitted list,
    // add a 'Request Location Access' action" - never a direct pick).
    const permitted = await UserLocationPermission.findAll({
      where: { UserID: userId, CanView: true },
    });
    const permittedIds = new Set(permitted.map((p) => p.PlantID));
    const validIds = (defaultPlantIds || []).map(Number).filter((id) => permittedIds.has(id));

    preferences.DefaultPlantIDs = JSON.stringify(validIds);
    preferences.DefaultPlantID = validIds[0] || null;
  }

  preferences.UpdatedAt = sequelize.literal("GETDATE()");
  await preferences.save();

  return getPreferences(userId);
};

// ==========================================
//  ADMIN USER MANAGEMENT (task item 4)
// ==========================================

const listUsers = async ({ page = 1, pageSize = 10, search = "" }) => {
  const where = search
    ? {
        [Op.or]: [
          { FullName: { [Op.like]: `%${search}%` } },
          { Email: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  const { count, rows } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: "role" }],
    order: [["UserID", "DESC"]],
    offset: (Number(page) - 1) * Number(pageSize),
    limit: Number(pageSize),
  });

  return {
    totalRecords: count,
    page: Number(page),
    pageSize: Number(pageSize),
    data: rows.map(sanitizeUser),
  };
};

const getUserById = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: "role" }],
  });
  if (!user) throw new Error("User not found.");
  return sanitizeUser(user);
};

// The admin never types a password: a random temporary one is emailed
// with the login ID, and the user sets their own at first sign-in. The
// email is sent before commit, so if it fails the user is not created.
const createUser = async ({ FullName, Email, MobileNo, RoleID }, { ip, actorId }) => {
  const existing = await User.findOne({ where: { Email } });
  if (existing) {
    throw new HttpError(400, "This email address is already in use.");
  }

  const tempPassword = generateTempPassword();
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create(
      {
        FullName,
        Email,
        MobileNo,
        RoleID,
        PasswordHash: await hashPassword(tempPassword),
        IsActive: true,
        MustChangePassword: true,
        PasswordChangedAt: literal("GETDATE()"),
      },
      { transaction }
    );
    await sendNewAccountEmail({ name: FullName, email: Email, tempPassword });
    return created;
  });

  await recordAuthEvent({ ip, actorId, userId: user.UserID, actionType: AUTH_AUDIT_ACTIONS.USER_CREATED, newData: { Email } });
  return sanitizeUser(user);
};

// "E-mail new password": a new random temporary password is emailed and
// the user must set their own at next sign-in. The email is sent before
// commit, so if it fails the old password is kept.
const emailNewPassword = async (userId, { ip, actorId }) => {
  const user = await User.findByPk(userId);
  if (!user) throw new HttpError(404, "User not found.");
  if (!user.IsActive) throw new HttpError(400, "This user is inactive. Activate them before sending a password.");

  const tempPassword = generateTempPassword();
  await sequelize.transaction(async (transaction) => {
    await replacePassword(user, tempPassword, { mustChange: true, transaction });
    await sendAdminResetEmail({ name: user.FullName, email: user.Email, tempPassword });
  });

  await recordAuthEvent({ ip, actorId, userId: user.UserID, actionType: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_BY_ADMIN });
  return user.Email;
};

const updateUser = async (userId, { FullName, Email, MobileNo, RoleID }) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found.");

  if (Email && Email !== user.Email) {
    const existing = await User.findOne({ where: { Email } });
    if (existing && existing.UserID !== user.UserID) {
      throw new Error("This email address is already in use.");
    }
    user.Email = Email;
  }

  if (FullName !== undefined) user.FullName = FullName;
  if (MobileNo !== undefined) user.MobileNo = MobileNo;
  if (RoleID !== undefined) user.RoleID = RoleID;

  await user.save();
  return sanitizeUser(user);
};

// Soft toggle only (task item 4: "activate/deactivate user (soft toggle,
// not delete)") - never destroys a User row, since users are referenced
// by historical audit logs, invoices, approvals, etc.
const setUserActive = async (userId, isActive) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found.");

  user.IsActive = isActive;
  await user.save();
  return sanitizeUser(user);
};

const deleteUserChildRows = async (userId, transaction) => {
  for (const table of USER_CHILD_TABLES) {
    await sequelize.query(`DELETE FROM [dbo].[${table}] WHERE [UserID] = :userId`, {
      type: QueryTypes.DELETE,
      replacements: { userId },
      transaction,
    });
  }
};

// Permanent deletion is Admin-only at the route and is blocked when business
// records still reference the user.
const hardDeleteUser = async (userId, req) => {
  if (Number(userId) === Number(req.user.UserID)) {
    throw new Error("You cannot permanently delete your own account.");
  }

  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found.");
  const oldData = sanitizeUser(user);

  try {
    await sequelize.transaction(async (transaction) => {
      await deleteUserChildRows(user.UserID, transaction);
      await user.destroy({ transaction });
    });
  } catch (error) {
    if (isForeignKeyReferenceError(error)) throw new Error(USER_IN_USE_MESSAGE);
    throw error;
  }

  await writeAuditLog({
    req,
    tableName: "Users",
    recordId: user.UserID,
    actionType: "HARD_DELETE",
    oldData,
  });
};

const listRoles = async () => {
  return await Role.findAll({ where: { IsActive: true }, order: [["RoleName", "ASC"]] });
};

module.exports = {
  updateProfile,
  changePassword,
  getPreferences,
  updatePreferences,
  listUsers,
  getUserById,
  createUser,
  emailNewPassword,
  updateUser,
  setUserActive,
  hardDeleteUser,
  listRoles,
};
