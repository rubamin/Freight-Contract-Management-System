const accessRequestService = require("../services/accessRequest.service");

const createAccessRequest = async (req, res) => {
  try {
    const request = await accessRequestService.createAccessRequest(req.user.UserID, req.body);
    return res.status(201).json({
      success: true,
      message: "Your request has been sent to the admin.",
      data: request,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const listPendingRequests = async (req, res) => {
  try {
    const requests = await accessRequestService.listPendingRequests();
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resolveAccessRequest = async (req, res) => {
  try {
    const request = await accessRequestService.resolveAccessRequest(
      req.params.id,
      req.user.UserID,
      req.body.decision
    );
    return res.status(200).json({
      success: true,
      message: `Request ${request.Status.toLowerCase()} successfully.`,
      data: request,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { createAccessRequest, listPendingRequests, resolveAccessRequest };
