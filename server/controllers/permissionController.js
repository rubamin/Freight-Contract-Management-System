const permissionService = require("../services/permission.service");

const getPermissions = async (req, res) => {
  try {
    const permissions = await permissionService.getUserPermissions(req.params.userId);

    return res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

// Convenience endpoint so the logged-in user's own sidebar/My Settings can
// fetch permissions without needing to know their own UserID up front.
const getMyPermissions = async (req, res) => {
  try {
    const permissions = await permissionService.getUserPermissions(req.user.UserID);

    return res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const updateModulePermissions = async (req, res) => {
  try {
    const permissions = await permissionService.setUserModulePermissions(
      req.params.userId,
      req.body.permissions
    );

    return res.status(200).json({
      success: true,
      message: "Module permissions updated successfully.",
      data: permissions,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateLocationPermissions = async (req, res) => {
  try {
    const permissions = await permissionService.setUserLocationPermissions(
      req.params.userId,
      req.body.plantIds
    );

    return res.status(200).json({
      success: true,
      message: "Location permissions updated successfully.",
      data: permissions,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPermissions,
  getMyPermissions,
  updateModulePermissions,
  updateLocationPermissions,
};
