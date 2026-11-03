const userService = require("../services/userService");
const { EmailDeliveryError } = require("../services/authMail.service");

const auditContext = (req) => ({ ip: req.ip, actorId: req.user?.UserID });

const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(
      req.user.UserID,
      req.body,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const session = await userService.changePassword(req.user.UserID, req.body, auditContext(req));

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      data: session,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Something went wrong. Please try again later.",
    });
  }
};

const getPreferences = async (req, res) => {
  try {
    const preferences = await userService.getPreferences(req.user.UserID);

    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const preferences = await userService.updatePreferences(req.user.UserID, req.body);

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully.",
      data: preferences,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
//  ADMIN USER MANAGEMENT (task item 4)
// ==========================================

const listUsers = async (req, res) => {
  try {
    const result = await userService.listUsers(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body, auditContext(req));
    return res.status(201).json({
      success: true,
      message: `User created. The login ID and a temporary password were emailed to ${user.Email}.`,
      data: user,
    });
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      return res.status(502).json({
        success: false,
        message: `User NOT created: the sign-in email could not be sent (${error.message}).`,
      });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

const emailNewPassword = async (req, res) => {
  try {
    const email = await userService.emailNewPassword(req.params.id, auditContext(req));
    return res.status(200).json({
      success: true,
      message: `A new temporary password was emailed to ${email}. They must set their own password at next sign-in.`,
    });
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      return res.status(502).json({
        success: false,
        message: `Password NOT changed: the email could not be sent (${error.message}).`,
      });
    }
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const setUserActive = async (req, res) => {
  try {
    const user = await userService.setUserActive(req.params.id, req.body.isActive);
    return res.status(200).json({
      success: true,
      message: `User ${req.body.isActive ? "activated" : "deactivated"} successfully.`,
      data: user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const hardDeleteUser = async (req, res) => {
  try {
    await userService.hardDeleteUser(req.params.id, req);
    return res.status(200).json({
      success: true,
      message: "User permanently deleted.",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await userService.listRoles();
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
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
  getRoles,
};
