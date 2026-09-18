// Column layout for the invoice Excel report. Kept as a constant so the
// header labels/order live in one place rather than inline in the controller.
const INVOICE_REPORT_COLUMNS = [
  { header: "Invoice No", key: "invoiceNumber", width: 20 },
  { header: "Date", key: "invoiceDate", width: 14 },
  { header: "Vendor", key: "vendorName", width: 28 },
  { header: "Location", key: "locationName", width: 22 },
  { header: "Customer", key: "customerName", width: 24 },
  { header: "LR Number", key: "lrNumber", width: 16 },
  { header: "From", key: "fromStation", width: 18 },
  { header: "To", key: "toStation", width: 18 },
  { header: "Amount", key: "totalAmount", width: 16 },
  { header: "Status", key: "statusName", width: 20 },
];

module.exports = { INVOICE_REPORT_COLUMNS };
