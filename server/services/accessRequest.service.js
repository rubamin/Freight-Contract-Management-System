const {
  AccessRequest,
  User,
  Plant,
  UserModulePermission,
  UserLocationPermission,
  Notification,
} = require("../models");
const sequelize = require("../config/database");
const { MODULE_KEYS, MODULE_LABELS } = require("../constants/modules");
const {
  NOTIFICATION_TYPE_ACCESS_REQUESTED,
  NOTIFICATION_TYPE_ACCESS_REQUEST_APPROVED,
  NOTIFICATION_TYPE_ACCESS_REQUEST_REJECTED,
} = require("../constants/notificationTypes");

// Creates a request for either a module permission (View/Add/Edit on a
// specific module) or a plant/location (task item 19: generalizes the
// earlier location-only request flow to any module or permission a user
// is missing). Also posts a Notification so the bell/sound fire for
// admins (task item 20).
const createAccessRequest = async (userId, { requestType, moduleKey, requestedAction, plantId }) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found.");

  if (requestType === "MODULE") {
    if (!Object.values(MODULE_KEYS).includes(moduleKey)) {
      throw new Error("Invalid module.");
    }
    if (!["view", "add", "edit"].includes(requestedAction)) {
      throw new Error("Invalid requested action.");
    }
  } else if (requestType === "LOCATION") {
    const plant = await Plant.findByPk(plantId);
    if (!plant) throw new Error("Plant not found.");
  } else {
    throw new Error('Invalid request type - expected "MODULE" or "LOCATION".');
  }

  const request = await AccessRequest.create({
    UserID: userId,
    RequestType: requestType,
    ModuleKey: requestType === "MODULE" ? moduleKey : null,
    RequestedAction: requestType === "MODULE" ? requestedAction : null,
    PlantID: requestType === "LOCATION" ? plantId : null,
  });

  const description =
    requestType === "MODULE"
      ? `${requestedAction} access to ${MODULE_LABELS[moduleKey] || moduleKey}`
      : `access to a plant/location`;

  await Notification.create({
    Type: NOTIFICATION_TYPE_ACCESS_REQUESTED,
    Message: `${user.FullName || user.Email} requested ${description}.`,
  });

  return request;
};

const listPendingRequests = async () => {
  return await AccessRequest.findAll({
    where: { Status: "PENDING" },
    include: [
      { model: User, as: "user", attributes: ["UserID", "FullName", "Email"] },
      { model: Plant, as: "plant" },
    ],
    order: [["RequestedAt", "DESC"]],
  });
};

// Approving actually grants the corresponding permission row (task item
// 19/20) - not just marking the request resolved - so the admin doesn't
// have to separately remember to also update User Master afterward.
const resolveAccessRequest = async (requestId, adminUserId, decision) => {
  if (!["APPROVED", "REJECTED"].includes(decision)) {
    throw new Error('Invalid decision - expected "APPROVED" or "REJECTED".');
  }

  const request = await AccessRequest.findByPk(requestId, {
    include: [{ model: User, as: "user" }],
  });
  if (!request) throw new Error("Access request not found.");
  if (request.Status !== "PENDING") {
    throw new Error("This request has already been resolved.");
  }

  request.Status = decision;
  request.ResolvedBy = adminUserId;
  request.ResolvedAt = sequelize.literal("GETDATE()");
  await request.save();

  if (decision === "APPROVED") {
    if (request.RequestType === "MODULE") {
      const [permission] = await UserModulePermission.findOrCreate({
        where: { UserID: request.UserID, ModuleKey: request.ModuleKey },
        defaults: { UserID: request.UserID, ModuleKey: request.ModuleKey },
      });
      const field = { view: "CanView", add: "CanAdd", edit: "CanEdit" }[request.RequestedAction];
      permission[field] = true;
      await permission.save();
    } else {
      await UserLocationPermission.findOrCreate({
        where: { UserID: request.UserID, PlantID: request.PlantID },
        defaults: { UserID: request.UserID, PlantID: request.PlantID, CanView: true },
      });
    }
  }

  await Notification.create({
    Type:
      decision === "APPROVED"
        ? NOTIFICATION_TYPE_ACCESS_REQUEST_APPROVED
        : NOTIFICATION_TYPE_ACCESS_REQUEST_REJECTED,
    Message: `${request.user?.FullName || request.user?.Email || "A user"}'s access request was ${decision.toLowerCase()}.`,
  });

  return request;
};

module.exports = { createAccessRequest, listPendingRequests, resolveAccessRequest };
