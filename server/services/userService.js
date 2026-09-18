const { Op } = require("sequelize");
const crypto = require("crypto");
const sequelize = require("../config/database");
const { User, Role, UserPreference, Plant, UserLocationPermission, Notification } = require("../models");
const { comparePassword, hashPassword } = require("../helpers/bcrpt");
const { sanitizeUser } = require("../utils/userSanitizer");
const { NOTIFICATION_TYPE_LOCATION_ACCESS_REQUESTED } = require("../constants/notificationTypes");

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

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findByPk(userId);

  if (!user || !user.PasswordHash) {
    throw new Error("User not found.");
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, user.PasswordHash);
  if (!isCurrentPasswordValid) {
    throw new Error("Current password is incorrect.");
  }

  user.PasswordHash = await hashPassword(newPassword);
  await user.save();

  return true;
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
  const permittedLocations = await UserLocationPermission.findAll({
    where: { UserID: userId, CanView: true },
    include: [{ model: Plant, as: "plant" }],
  });

  return {
    ...fullPreferences.toJSON(),
    defaultPlantIds: parseDefaultPlantIds(fullPreferences.DefaultPlantIDs),
    permittedPlants: permittedLocations.map((p) => p.plant).filter(Boolean),
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

// Sends an admin-visible notification asking for access to a plant the
// user doesn't currently have UserLocationPermission for, instead of
// letting them pick it directly (task item 5). Accepts either a real
// PlantID (preferred, once the frontend has a picker over un-permitted
// plants) or a free-text plant name for this simplified first version.
const requestLocationAccess = async (userId, plantIdOrName) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found.");

  let plantLabel = plantIdOrName;
  if (!Number.isNaN(Number(plantIdOrName))) {
    const plant = await Plant.findByPk(plantIdOrName);
    if (plant) {
      plantLabel = plant.PlantName || plant.PlantCode;
    }
  }

  await Notification.create({
    Type: NOTIFICATION_TYPE_LOCATION_ACCESS_REQUESTED,
    Message: `${user.FullName || user.Email} requested access to ${plantLabel}.`,
  });

  return true;
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

const createUser = async ({ FullName, Email, MobileNo, RoleID, Password }) => {
  const existing = await User.findOne({ where: { Email } });
  if (existing) {
    throw new Error("This email address is already in use.");
  }

  const user = await User.create({
    FullName,
    Email,
    MobileNo,
    RoleID,
    PasswordHash: await hashPassword(Password || crypto.randomBytes(8).toString("hex")),
    IsActive: true,
  });

  return sanitizeUser(user);
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

const listRoles = async () => {
  return await Role.findAll({ where: { IsActive: true }, order: [["RoleName", "ASC"]] });
};

module.exports = {
  updateProfile,
  changePassword,
  getPreferences,
  updatePreferences,
  requestLocationAccess,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserActive,
  listRoles,
};
