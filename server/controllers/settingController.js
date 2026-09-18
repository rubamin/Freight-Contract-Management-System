const settingService = require("../services/setting.service");

const getSettingMetadata = async (req, res) => {
    try {
        const data = await settingService.getSettingMetadata();
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("🚨 Error in getSettingMetadata:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const saveApprovalConfig = async (req, res) => {
    try {
        await settingService.saveApprovalConfig(req.body);
        return res.status(200).json({ 
            success: true, 
            message: "Responsible Person for approval saved successfully!" 
        });
    } catch (error) {
        console.error("🚨 Error in saveApprovalConfig:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const addMasterItem = async (req, res) => {
    try {
        const result = await settingService.addMasterItem(req.body);
        return res.status(201).json({ 
            success: true, 
            message: `${result.type} ${result.action} successfully!` 
        });
    } catch (error) {
        console.error("🚨 Error in addMasterItem:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ success: false, message: error.message });
    }
};

module.exports = {
    getSettingMetadata,
    saveApprovalConfig,
    addMasterItem,
};