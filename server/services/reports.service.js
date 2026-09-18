const { InvoiceHeader, Vendor, Plant, StatusMaster } = require("../models");
const { buildInvoiceFilterWhere } = require("../utils/invoiceFilters");

// Fetches InvoiceHeader rows (joined with Vendor, Plant, StatusMaster) for
// the given filters and shapes them into flat rows ready for the Excel
// export. Uses the same buildInvoiceFilterWhere shared with the Invoice
// List endpoint, so filter behavior stays identical between the two.
const getInvoiceReportRows = async (filters) => {
  const invoices = await InvoiceHeader.findAll({
    where: buildInvoiceFilterWhere(filters),
    include: [
      { model: Vendor, as: "vendor", attributes: ["VendorName"] },
      { model: Plant, as: "plant", attributes: ["PlantName", "City"] },
      { model: StatusMaster, as: "invoiceStatus", attributes: ["StatusName"] },
    ],
    order: [["InvoiceDate", "DESC"]],
  });

  return invoices.map((invoice) => ({
    invoiceNumber: invoice.InvoiceNumber,
    invoiceDate: invoice.InvoiceDate,
    vendorName: invoice.vendor?.VendorName || "-",
    locationName: invoice.LocationName || invoice.plant?.PlantName || "-",
    customerName: invoice.CustomerName || "-",
    lrNumber: invoice.LRNumber || "-",
    fromStation: invoice.FromStation || "-",
    toStation: invoice.ToStation || "-",
    totalAmount: Number(invoice.TotalInvoiceAmount || 0),
    statusName: invoice.invoiceStatus?.StatusName || "-",
  }));
};

module.exports = { getInvoiceReportRows };
