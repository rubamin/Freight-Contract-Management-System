// Column layout for the invoice Excel report. Kept as a constant so the
// header labels/order live in one place rather than inline in the controller.
const INVOICE_REPORT_COLUMNS = [
  { header: "Invoice No", key: "invoiceNumber", width: 20 },
  { header: "Date", key: "invoiceDate", width: 14 },
  { header: "Vendor", key: "vendorName", width: 28 },
  { header: "Location", key: "locationName", width: 22 },
  { header: "Customer / Supplier", key: "customerName", width: 24 },
  { header: "LR Number", key: "lrNumber", width: 16 },
  { header: "SO Number", key: "soNumber", width: 16 },
  { header: "From", key: "fromStation", width: 18 },
  { header: "To", key: "toStation", width: 18 },
  { header: "Amount", key: "totalAmount", width: 16 },
  { header: "Status", key: "statusName", width: 20 },
  { header: "Approval Status", key: "approvalStatus", width: 22 },
  { header: "Entered By", key: "enteredBy", width: 22 },
  { header: "Entered On", key: "enteredOn", width: 20 },
  { header: "Draft Saved On", key: "draftCreatedAt", width: 20 },
  { header: "Sent for Approval On", key: "submittedForApprovalAt", width: 20 },
  { header: "Approved By", key: "approvedBy", width: 22 },
  { header: "Approved On", key: "approvedAt", width: 20 },
  { header: "Remark by User", key: "userRemarks", width: 30 },
  { header: "System Remarks", key: "systemRemarks", width: 40 },
];

module.exports = { INVOICE_REPORT_COLUMNS };
