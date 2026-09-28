const {
  InvoiceHeader,
  InvoiceVerification,
  VerificationError,
  InvoiceApprovalHistory,
  InvoiceStatusHistory,
} = require("../models");


const runInvoiceVerification = async ({ invoiceId, userId }) => {
  const invoice = await InvoiceHeader.findByPk(invoiceId);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const basicFreight = Number(invoice.BasicFreight || 0);
  const otherCharges = Number(invoice.OtherCharges || 0);
  const gstAmount = Number(invoice.GSTAmount || 0);
  const invoiceAmount = Number(invoice.TotalInvoiceAmount || 0);
  const expectedAmount = basicFreight + otherCharges + gstAmount;
  const differenceAmount = invoiceAmount - expectedAmount;
  const errors = [];

  if (!invoice.ContractID) {
    errors.push({
      ErrorType: "MISSING_CONTRACT",
      FieldName: "ContractID",
      ExpectedValue: "Contract reference",
      ActualValue: null,
      Remarks: "Invoice is not linked to a contract.",
    });
  }

  if (Number(differenceAmount.toFixed(2)) !== 0) {
    errors.push({
      ErrorType: "AMOUNT_MISMATCH",
      FieldName: "TotalInvoiceAmount",
      ExpectedValue: expectedAmount.toFixed(2),
      ActualValue: invoiceAmount.toFixed(2),
      Remarks: "Invoice amount does not match freight, charges, and GST total.",
    });
  }

  const verification = await InvoiceVerification.create({
    InvoiceID: invoice.InvoiceID,
    ContractID: invoice.ContractID,
    ExpectedAmount: expectedAmount,
    InvoiceAmount: invoiceAmount,
    DifferenceAmount: differenceAmount,
    VerificationStatus: errors.length ? "FAILED" : "PASSED",
    VerifiedBy: userId,
    VerifiedDate: new Date(),

  });

  if (errors.length) {
    await VerificationError.bulkCreate(
      errors.map((error) => ({
        ...error,
        VerificationID: verification.VerificationID,
      }))
    );
  }

  return await InvoiceVerification.findByPk(verification.VerificationID, {
    include: [
      {
        model: VerificationError,
        as: "errors",
      },
    ],
  });
};

const approveInvoice = async ({ invoiceId, statusId, remarks, userId }) => {
  const invoice = await InvoiceHeader.findByPk(invoiceId);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const oldStatusId = invoice.InvoiceStatusID;

  await invoice.update({
    InvoiceStatusID: statusId,
  });

  const approval = await InvoiceApprovalHistory.create({
    InvoiceID: invoiceId,

    ApprovedBy: userId,
    StatusID: statusId,
    Remarks: remarks,
  });

  await InvoiceStatusHistory.create({
    InvoiceID: invoiceId,
    OldStatusID: oldStatusId,
    NewStatusID: statusId,
    ChangedBy: userId,
    Remarks: remarks,
  });


  return approval;
};

module.exports = {
  runInvoiceVerification,
  approveInvoice,
};
