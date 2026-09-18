const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { formatDateForDisplay } = require("../utils/dateFormatter");

// Shared branding constants so the Excel and PDF exports (task item 6) stay
// visually consistent with each other and with each other's field order.
const DOCUMENT_TITLE = "FreightContractDB";
const DOCUMENT_SUBTITLE = "Contract Summary";
const BRAND_COLOR = "1F4E79"; // dark blue, used for headers in both formats

// Builds the plain-data shape both the Excel and PDF exporters render from,
// so a field added/removed here automatically stays in sync between the
// two formats instead of being duplicated in two separate builders.
const buildContractDocumentData = (contract) => {
  const rateMatrixRows = (contract.rateMatrix || []).map((row) => ({
    destination: row.destination?.City || "-",
    vehicleType: row.vehicleType?.VehicleName || "-",
    weight: row.weight ? `${row.weight.Weight ?? ""} ${row.weight.WeightUnit || ""}`.trim() : "-",
    baseRate: row.BaseRate != null ? Number(row.BaseRate).toFixed(2) : "-",
  }));

  return {
    contractNo: contract.ContractNo,
    vendorName: contract.vendor?.VendorName || "-",
    vendorPAN: contract.VendorPAN || contract.vendor?.PANNo || "-",
    startDate: formatDateForDisplay(contract.ContractStartDate),
    endDate: formatDateForDisplay(contract.ContractEndDate),
    status: contract.Status || "-",
    remarks: contract.Remarks || "-",
    rateMatrixRows,
  };
};

const buildContractExcel = async (contract) => {
  const data = buildContractDocumentData(contract);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Contract Summary");

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = `${DOCUMENT_TITLE} — ${DOCUMENT_SUBTITLE}`;
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: `FF${BRAND_COLOR}` } };

  const detailRows = [
    ["Contract No.", data.contractNo],
    ["Vendor Name", data.vendorName],
    ["Vendor PAN", data.vendorPAN],
    ["Start Date", data.startDate],
    ["End Date", data.endDate],
    ["Status", data.status],
    ["Remarks", data.remarks],
  ];
  detailRows.forEach(([label, value], index) => {
    const row = sheet.getRow(index + 3);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = value;
  });

  const tableStartRow = detailRows.length + 5;
  const headerRow = sheet.getRow(tableStartRow);
  ["Destination", "Vehicle Type", "Weight", "Base Rate (INR)"].forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND_COLOR}` } };
  });

  data.rateMatrixRows.forEach((row, index) => {
    const excelRow = sheet.getRow(tableStartRow + index + 1);
    excelRow.getCell(1).value = row.destination;
    excelRow.getCell(2).value = row.vehicleType;
    excelRow.getCell(3).value = row.weight;
    excelRow.getCell(4).value = row.baseRate;
  });

  sheet.columns.forEach((col) => {
    col.width = 24;
  });

  return workbook;
};

// Renders the exact same sections/fields as buildContractExcel above, in
// the same order, so the PDF and Excel exports are consistent with each
// other rather than two independently-drifted formats.
const buildContractPdf = (contract) => {
  const data = buildContractDocumentData(contract);
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  doc.fillColor(`#${BRAND_COLOR}`).fontSize(18).text(DOCUMENT_TITLE, { align: "left" });
  doc.fontSize(13).text(DOCUMENT_SUBTITLE);
  doc.moveDown();

  doc.fillColor("#000000").fontSize(11);
  const detailRows = [
    ["Contract No.", data.contractNo],
    ["Vendor Name", data.vendorName],
    ["Vendor PAN", data.vendorPAN],
    ["Start Date", data.startDate],
    ["End Date", data.endDate],
    ["Status", data.status],
    ["Remarks", data.remarks],
  ];
  detailRows.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
  });

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(12).fillColor(`#${BRAND_COLOR}`).text("Rate Matrix");
  doc.moveDown(0.5);

  const columnWidths = [150, 150, 100, 100];
  const startX = doc.x;
  let y = doc.y;

  const drawRow = (cells, isHeader = false) => {
    doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(isHeader ? "#FFFFFF" : "#000000");
    if (isHeader) {
      doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), 20).fill(`#${BRAND_COLOR}`);
      doc.fillColor("#FFFFFF");
    }
    let x = startX;
    cells.forEach((cell, i) => {
      doc.text(String(cell), x + 4, y + 5, { width: columnWidths[i] - 8 });
      x += columnWidths[i];
    });
    y += 22;
  };

  drawRow(["Destination", "Vehicle Type", "Weight", "Base Rate (INR)"], true);
  data.rateMatrixRows.forEach((row) => {
    if (y > 750) {
      doc.addPage();
      y = 40;
    }
    drawRow([row.destination, row.vehicleType, row.weight, row.baseRate]);
  });

  doc.end();
  return doc;
};

module.exports = { buildContractDocumentData, buildContractExcel, buildContractPdf };
