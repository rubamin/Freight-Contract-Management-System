const reportsService = require("../services/reports.service");
const { buildWorkbookFromRows } = require("../utils/excelExport");
const { INVOICE_REPORT_COLUMNS } = require("../constants/reportColumns");

const exportInvoices = async (req, res) => {
  try {
    const rows = await reportsService.getInvoiceReportRows(req.query);

    const workbook = buildWorkbookFromRows({
      sheetName: "Invoices",
      columns: INVOICE_REPORT_COLUMNS,
      rows,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-report-${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Failed to export invoice report:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export report.",
    });
  }
};

module.exports = { exportInvoices };
