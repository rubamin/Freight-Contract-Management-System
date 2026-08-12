const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middleware/authMiddleware'); // Admin check middleware
const roleMiddleware = require('../middleware/roleMiddeleware');

router.get('/metadata', authMiddleware, settingController.getSettingMetadata);
router.post('/approval-config', authMiddleware, settingController.saveApprovalConfig);
router.post('/master', authMiddleware, settingController.addMasterItem);

module.exports = router;