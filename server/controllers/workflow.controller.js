const workflowService = require("../services/workflow.service");

const runInvoiceVerification = async (req, res) => {
  try {
    const verification = await workflowService.runInvoiceVerification({
      invoiceId: req.params.invoiceId,
      userId: req.user.UserID,
    });

    return res.status(201).json({
      success: true,
      message: "Invoice verification completed.",
      data: verification,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const approveInvoice = async (req, res) => {
  try {
    const approval = await workflowService.approveInvoice({
      invoiceId: req.params.invoiceId,
      statusId: req.body.StatusID,
      remarks: req.body.Remarks,
      userId: req.user.UserID,
    });

    return res.status(201).json({
      success: true,
      message: "Invoice approval recorded successfully.",
      data: approval,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  runInvoiceVerification,
  approveInvoice,
};
