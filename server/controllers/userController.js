const userService = require("../services/userService");

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
    await userService.changePassword(req.user.UserID, req.body);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
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

const requestLocationAccess = async (req, res) => {
  try {
    await userService.requestLocationAccess(req.user.UserID, req.body.plantId);

    return res.status(200).json({
      success: true,
      message: "Your request has been sent to the admin.",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
    const user = await userService.createUser(req.body);
    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
  requestLocationAccess,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserActive,
  getRoles,
};
