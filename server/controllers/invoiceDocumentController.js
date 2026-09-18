const { 
  InvoiceHeader, 
  InvoiceItem, 
  InvoiceVerification, 
  Vendor, 
  VendorGST, 
  ContractMaster, 
  ContractRateMatrix, 
  DestinationMaster, 
  VehicleType,
<<<<<<< HEAD
  WeightMaster,
  Plant,
  PlantLocation,
=======
  Plant,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  StatusMaster
} = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize"); 
<<<<<<< HEAD
const nodemailer = require("nodemailer");
const fs = require('fs');
const path = require('path');
const { resolveValidPlant } = require("../utils/plantHelper");
const { isForeignKeyViolationForTable } = require("../utils/dbErrorHelper");
const { normalizeDateForDb } = require("../utils/dateFormatter");
const { getRecipientEmailForLocation } = require("../utils/approvalConfigHelper");
const { INVALID_PLANT_LOCATION_MESSAGE } = require("../constants/messages");
const { DEFAULT_NOTIFICATION_EMAIL } = require("../constants/email");
const { PENDING_VERIFICATION_STATUS_NAME, VERIFICATION_STATUS_APPROVED, VERIFICATION_STATUS_DISCREPANCY, VERIFICATION_STATUS_PRE_APPROVED } = require("../constants/invoiceStatus");
const notificationService = require("../services/notification.service");
const {
  NOTIFICATION_TYPE_INVOICE_CREATED,
  NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
  NOTIFICATION_TYPE_EMAIL_SENT,
} = require("../constants/notificationTypes");

// State mapping dictionary based on GST number prefix
=======
const axios = require("axios");
const nodemailer = require("nodemailer");
const fs = require('fs');
const path = require('path');

const geoCache = {};

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const GST_STATE_MAP = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

<<<<<<< HEAD
// Helper function to extract state name from GST number
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const getStateFromGST = (gstNumber) => {
  if (!gstNumber || typeof gstNumber !== "string" || gstNumber.length < 2) return "Gujarat";
  const stateCode = gstNumber.substring(0, 2);
  return GST_STATE_MAP[stateCode] || "Gujarat";
};

<<<<<<< HEAD
const normalizeRequiredDateForDb = (value, fieldName) => {
  const normalized = normalizeDateForDb(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required and must be a valid date.`);
  }
  return normalized;
};

const normalizeOptionalDateForDb = (value) => normalizeDateForDb(value) || null;

const safeNotify = async (payload, transaction) => {
  try {
    await notificationService.notify(payload, transaction);
  } catch (error) {
    console.error("Notification write failed but the main transaction will continue:", error);
  }
};

// Configure Nodemailer transporter for email notifications
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: DEFAULT_NOTIFICATION_EMAIL,
=======
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getCoordinates = async (cityName) => {
  const cleanCity = String(cityName || "").replace(/\([^)]*\)/g, "").trim().toUpperCase();
  if (!cleanCity) return null;
  if (geoCache[cleanCity]) return geoCache[cleanCity];

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanCity + ", India")}&format=json&limit=1`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "FreightContractManagementSystem/5.0" },
      timeout: 3000 
    });

    if (response.data && response.data.length > 0) {
      const coords = { lat: response.data[0].lat, lon: response.data[0].lon };
      geoCache[cleanCity] = coords;
      return coords;
    }
    return null;
  } catch (error) {
    console.error("GEOCODE ERROR DETAILS:", error.message || error);
    return null; 
  }
};

const getCommercialDrivingDistanceKM = async (fromCity, toCity) => {
  try {
    const sourceCoords = await getCoordinates(fromCity);
    if (!sourceCoords) return 0;
    
    await sleep(200); 
    const targetCoords = await getCoordinates(toCity);
    if (!targetCoords) return 0;

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${sourceCoords.lon},${sourceCoords.lat};${targetCoords.lon},${targetCoords.lat}?overview=false`;
    const response = await axios.get(osrmUrl, { timeout: 3000 });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      return parseFloat((response.data.routes[0].distance / 1000).toFixed(2)); 
    }
    return 0;
  } catch (error) {
    console.error("OSRM DISTANCE ERROR DETAILS:", error.message || error);
    return 0;
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "dhvanidr1204@gmail.com",
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    pass: process.env.EMAIL_PASS || ""
  }
});

<<<<<<< HEAD
// Function to send audit discrepancy notification emails with attachments
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const sendAuditNotificationEmail = async (invoiceData, recipientEmail, attachmentsList = []) => {
  try {
    if (!recipientEmail) return false;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { background-color: #f4f7f6; font-family: Arial, sans-serif; color: #333333; margin: 0; padding: 20px; }
          .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e0e0e0; }
          .email-header { background-color: #1a365d; color: #ffffff; padding: 24px; text-align: center; }
          .email-body { padding: 24px; background-color: #fafbfc; }
          .section-title { font-size: 16px; font-weight: bold; color: #2c3e50; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #edf2f7; }
          .info-table td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #edf2f7; }
          .info-table td.label { font-weight: bold; color: #4a5568; width: 35%; background-color: #f7fafc; }
          .alert-box { background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; }
          .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 4px; background-color: #fed7d7; color: #9b2c2c; }
          .remarks-box { background-color: #edf2f7; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #2d3748; font-style: italic; }
          .email-footer { text-align: center; padding: 16px; font-size: 12px; color: #a0aec0; background-color: #f7fafc; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h2>Freight Invoice Audit & Approval Alert</h2>
          </div>
          <div class="email-body">
            <p style="margin-top: 0; font-size: 14px;">Dear Operations Team,</p>
            <p style="font-size: 14px;">An invoice entry requires your review due to conditional audit discrepancies or rate mismatches:</p>
            
            <div class="alert-box">
              <div style="font-weight: bold; margin-bottom: 8px; color: #744210; font-size: 14px;">Triggered Audit Conditions:</div>
              <ul>
                ${invoiceData.hasExtraCharge ? `<li><strong>Extra Charge Applied:</strong> ₹ ${invoiceData.extraCharge.toFixed(2)}</li>` : ""}
                ${invoiceData.hasDetainCharge ? `<li><strong>Detention Charge Applied:</strong> ₹ ${invoiceData.detainCharge.toFixed(2)}</li>` : ""}
                ${invoiceData.hasContractMatchFailure ? `<li><strong>Contract Match Failure:</strong> No active contract found for Vendor.</li>` : ""}
<<<<<<< HEAD
                ${invoiceData.hasVehicleTypeNotFound ? `<li><strong>Vehicle Type Error:</strong> Vehicle type is not available in master.</li>` : ""}
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
                ${invoiceData.hasVehicleTypeMismatch ? `<li><strong>Vehicle Type / Rate Mismatch:</strong> Mismatch detected in vehicle type capacity or destination rate matrix.</li>` : ""}
              </ul>
            </div>

            <div class="section-title">📋 Invoice Summary Details</div>
            <table class="info-table">
              <tr><td class="label">Invoice Number</td><td><strong>${invoiceData.invoiceNo}</strong></td></tr>
<<<<<<< HEAD
              <tr><td class="label">Customer Name</td><td>${invoiceData.CustomerName}</td></tr>
=======
              <tr><td class="label">Customer Name</td><td>${invoiceData.customerName}</td></tr>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
              <tr><td class="label">Invoice Date</td><td>${invoiceData.invoiceDate}</td></tr>
              <tr><td class="label">LR Date</td><td>${invoiceData.lrDate}</td></tr>
              <tr><td class="label">Vendor Name</td><td>${invoiceData.vendorName} (${invoiceData.vendorCode})</td></tr>
              <tr><td class="label">GST Number</td><td>${invoiceData.gstNumber}</td></tr>
<<<<<<< HEAD
              <tr><td class="label">LR Number</td><td>${invoiceData.lrNo}</td></tr>
              <tr><td class="label">Route</td><td>${invoiceData.LocationName} → ${invoiceData.toStation}</td></tr>
=======
              <tr><td class="label">LR Number / Vehicle</td><td>${invoiceData.lrNo} / ${invoiceData.vehicleNo}</td></tr>
              <tr><td class="label">Route</td><td>${invoiceData.fromStation} → ${invoiceData.toStation}</td></tr>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
              <tr><td class="label">Actual Weight</td><td>${invoiceData.actualWeight} MT</td></tr>
            </table>

            <div class="section-title">💰 Financial Breakdown</div>
            <table class="info-table">
              <tr><td class="label">Billed Freight</td><td>₹ ${invoiceData.freightCharge.toFixed(2)}</td></tr>
              <tr><td class="label">Expected Freight</td><td>₹ ${invoiceData.calculatedExpectedFreight.toFixed(2)}</td></tr>
              <tr><td class="label">Net Variance</td><td><strong>₹ ${invoiceData.variance.toFixed(2)}</strong></td></tr>
              <tr><td class="label">Audit Status</td><td><span class="badge">${invoiceData.finalAuditDecision}</span></td></tr>
            </table>

            <div class="section-title">💬 Audit Remarks</div>
            <div class="remarks-box">"${invoiceData.auditRemarks}"</div>
          </div>
          <div class="email-footer">Freight Contract Management System Automation</div>
        </div>
      </body>
      </html>
    `;

    let mailAttachments = [];
    if (attachmentsList && attachmentsList.length > 0) {
      mailAttachments = attachmentsList.filter(Boolean).map(item => {
        const absolutePath = path.resolve(item.filePath);
        if (fs.existsSync(absolutePath)) {
          return {
            filename: item.originalName,
            path: absolutePath
          };
        }
        return null;
      }).filter(Boolean);
    }

    await transporter.sendMail({
<<<<<<< HEAD
      from: DEFAULT_NOTIFICATION_EMAIL,
=======
      from: process.env.EMAIL_USER || "dhvanidr1204@gmail.com",
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      to: recipientEmail,
      subject: `Action Required: Freight Audit Discrepancy — Invoice [${invoiceData.invoiceNo}]`,
      html: htmlContent,
      attachments: mailAttachments
    });

    return true;
  } catch (emailError) {
    console.error("Failed to send audit notification email:", emailError);
    return false;
  }
};

<<<<<<< HEAD
// Maps the persisted VerificationStatus value to the same label the
// Invoice List page's status Chip shows (see InvoiceList.jsx statusConfig),
// so the emailed table reads the same as the on-screen table.
const INVOICE_STATUS_LABELS = {
  PRE_APPROVED: "Pre-Approved",
  APPROVED: "Approved",
  DISCREPANCY: "Discrepancy",
};

// Renders a stored Doc path as just its filename for the email table - the
// actual files are attached to the email itself (see sendSelectedInvoicesMail),
// so the table only needs to name them, not link to a local server path.
const docFileName = (docPath) => {
  if (!docPath) return "-";
  return String(docPath).replace(/\\/g, "/").split("/").pop();
};

// Builds the summary table rows HTML for a group of invoices. Mirrors the
// Invoice List page's table columns exactly (see InvoiceList.jsx) - minus
// the selection checkbox and the Edit action, which have no meaning here.
const buildInvoiceSummaryRowsHtml = (invoices) => invoices.map((inv, idx) => {
  const extraCharged = parseFloat(inv.VarianceAmount || 0);
  const extraChargedDisplay = extraCharged <= 15 ? "0.00" : extraCharged.toFixed(2);

  return `
  <tr>
    <td style="border: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.LocationName || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.UploadedDateStr || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.InvoiceNumber || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.InvoiceDate || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.CustomerName || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.GSTNumber || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.LRDate || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.LRNumber || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.VehicleType || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.LocationName || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.ToStation || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${parseFloat(inv.ActualWeight || 0)} MT</td>
    <td style="border: 1px solid #ddd; padding: 8px;">₹${parseFloat(inv.BasicFreight || 0).toFixed(2)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">₹${parseFloat(inv.DetainCharges || 0).toFixed(2)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">₹${parseFloat(inv.ExtraCharges || 0).toFixed(2)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">₹${parseFloat(inv.TotalInvoiceAmount || 0).toFixed(2)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.PreAppr || 'No'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${INVOICE_STATUS_LABELS[inv.AuditStatus] || inv.AuditStatus || '-'}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">₹${parseFloat(inv.ExpectedAmount || 0).toFixed(2)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">₹${extraChargedDisplay}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${docFileName(inv.Doc1Path)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${docFileName(inv.Doc2Path)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${docFileName(inv.Doc3Path)}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${inv.Remarks || '-'}</td>
  </tr>
`;
}).join('');

// Builds the full summary report HTML for a group of invoices
const buildInvoiceSummaryTableHtml = (invoices) => `
  <h3>Selected Invoices Summary Report</h3>
  <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">#</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Location</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Upload Date</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Invoice No</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Invoice Date</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Customer Name</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">GST Number</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">LR Date</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">LR No</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Vehicle Type</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">From</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">To</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Weight (MT)</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Freight Chg</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Detain Chg</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Extra Chg</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total Amount</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pre-Appr</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Actual Contract Price</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Extra Charged</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Doc 1</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Doc 2</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Doc 3</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${buildInvoiceSummaryRowsHtml(invoices)}
    </tbody>
  </table>
`;

// Groups invoices by their LocationID (the real Company->SBU->Plant->
// Location hierarchy - N1, N2, etc. - that ApprovalConfig.LocationID is
// defined against) so each location gets its own email, routed to that
// location's own ApprovalConfig recipient. This used to group by PlantID
// instead, which is a different, unrelated ID space (the old Plants
// master) - ApprovalConfig lookups against it almost never matched
// anything, so every group silently fell back to the same default
// notification email regardless of location.
const UNASSIGNED_LOCATION_GROUP_KEY = "unassigned";

const groupInvoicesByLocationId = (invoices) => {
  return invoices.reduce((groups, invoice) => {
    const locationId = invoice.LocationID ?? invoice.locationId ?? UNASSIGNED_LOCATION_GROUP_KEY;
    const groupKey = String(locationId);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(invoice);
    return groups;
  }, {});
};

// Function to send selected invoices summary report via email from the frontend,
// grouped by Location so each location's ApprovalConfig recipient gets
// only the invoices belonging to their location.
const sendSelectedInvoicesMail = async (req, res) => {
  try {
    const { invoices } = req.body;
    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ message: "No invoices provided to send via email." });
    }

    const invoiceGroupsByLocationId = groupInvoicesByLocationId(invoices);

    for (const [locationId, groupInvoices] of Object.entries(invoiceGroupsByLocationId)) {
      const isUnassignedGroup = locationId === UNASSIGNED_LOCATION_GROUP_KEY;
      const recipientEmail = await getRecipientEmailForLocation(isUnassignedGroup ? null : locationId);
      const groupLocationName = groupInvoices[0]?.LocationName || "Unassigned Location";

      // Attach every uploaded document across this group's invoices, so the
      // approval recipient has the source files alongside the summary
      // table, the same way sendAuditNotificationEmail already does.
      const mailAttachments = groupInvoices
        .flatMap(inv => [inv.Doc1Path, inv.Doc2Path, inv.Doc3Path])
        .filter(Boolean)
        .map(docPath => {
          const absolutePath = path.resolve(docPath);
          return fs.existsSync(absolutePath)
            ? { filename: docFileName(docPath), path: absolutePath }
            : null;
        })
        .filter(Boolean);

      await transporter.sendMail({
        from: DEFAULT_NOTIFICATION_EMAIL,
        to: recipientEmail,
        subject: `Selected Invoices Summary Report — ${groupLocationName} (${groupInvoices.length} Items)`,
        html: buildInvoiceSummaryTableHtml(groupInvoices),
        attachments: mailAttachments
      });
    }

    return res.status(200).json({ success: true, message: "Selected invoices email sent successfully!" });
  } catch (error) {
    console.error("Error sending selected invoices mail:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send email." });
  }
};

// Finds (or creates) the Vendor + VendorGST pair for a given GST number.
// Shared by uploadDocument (create) and updateInvoices (edit) so both flows
// resolve vendor/GST identically.
const resolveVendorAndGst = async (gstNumber, customerNameFallback, transaction) => {
  const extractedPAN = gstNumber.substring(2, 12);

  let vendor = await Vendor.findOne({ where: { PANNo: extractedPAN }, transaction });
  if (!vendor) {
    vendor = await Vendor.create({
      VendorCode: `VND-${Date.now().toString().slice(-6)}`,
      VendorName: customerNameFallback || `Auto Synchronized Vendor (${extractedPAN})`,
      PANNo: extractedPAN,
      IsActive: true
    }, { transaction });
  }

  const derivedStateName = getStateFromGST(gstNumber);
  let vendorGst = await VendorGST.findOne({ where: { GSTNumber: gstNumber, VendorID: vendor.VendorID }, transaction });
  if (!vendorGst) {
    vendorGst = await VendorGST.create({
      VendorID: vendor.VendorID,
      GSTNumber: gstNumber,
      StateName: derivedStateName,
      IsDefault: false
    }, { transaction });
  }

  return { vendor, vendorGst, extractedPAN };
};

// Writes a newly uploaded attachment to disk with a unique filename and
// returns its relative path, in the same style uploadDocument uses for
// Doc1/2/3 on creation. Used only by updateInvoices - uploadDocument's own
// inline per-document blocks are left untouched.
const writeUploadedInvoiceFile = (file, idPart, slotLabel, uploadsDir) => {
  const originalName = file.originalname || `${slotLabel}.pdf`;
  const fileExt = path.extname(originalName);
  const safeIdPart = String(idPart).replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueFileName = `inv_${safeIdPart}_${slotLabel}_${Date.now()}${fileExt}`;
  const fullPath = path.join(uploadsDir, uniqueFileName);
  fs.writeFileSync(fullPath, file.buffer);
  return `uploads/${uniqueFileName}`;
};

// Resolves a VehicleType record from either a VehicleTypeID or a free-text
// vehicle name. Shared by uploadDocument and updateInvoices.
const resolveVehicleTypeFromInput = async (inputVehicleType, transaction) => {  let resolvedVehicleTypeId = null;
  let hasVehicleTypeNotFound = false;

  if (inputVehicleType) {
    const isIdQuery = !isNaN(inputVehicleType);
    const vehicleTypeRecord = await VehicleType.findOne({
      where: isIdQuery ? { VehicleTypeID: inputVehicleType } : { VehicleName: { [Op.like]: String(inputVehicleType).trim() } },
      transaction
    });

    if (!vehicleTypeRecord) {
      hasVehicleTypeNotFound = true;
    } else {
      resolvedVehicleTypeId = vehicleTypeRecord.VehicleTypeID;
    }
  } else {
    hasVehicleTypeNotFound = true;
  }

  return { resolvedVehicleTypeId, hasVehicleTypeNotFound };
};

// Runs the contract-rate-matching audit for one invoice row and returns the
// computed outcome. This is the single source of truth for "does the
// contract rate match" logic, shared by uploadDocument (create) and
// updateInvoices (edit) so both flows compute the matching status
// identically and accurately.
const computeContractAudit = async ({
  vendorId, extractedPAN, toStation, actualWeight, resolvedVehicleTypeId,
  hasVehicleTypeNotFound, freightCharge, contractId
}, transaction) => {
  // If the uploader explicitly selected a Contract No on the Add Invoice
  // grid (task item 9), audit against that specific contract instead of
  // whichever contract happens to be the vendor's current ACTIVE one -
  // the two usually agree, but an explicit selection should win.
  const activeContract = contractId
    ? await ContractMaster.findByPk(contractId, { transaction })
    : await ContractMaster.findOne({ where: { VendorID: vendorId, Status: "ACTIVE" }, transaction });

  let calculatedExpectedFreight = 0;
  let targetContractId = null;
  let auditRemarks = "";
  let finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
  let matchedDestinationFound = false;
  let hasVehicleTypeMismatch = false;

  const destination = await DestinationMaster.findOne({
    where: { City: { [Op.like]: toStation.trim() } },
    transaction
  });

  if (activeContract) {
    targetContractId = activeContract.ContractID;

    if (destination && !hasVehicleTypeNotFound) {
      const destinationMatrixEntries = await ContractRateMatrix.findAll({
        where: {
          ContractID: activeContract.ContractID,
          DestinationID: destination.DestinationID
        },
        include: [
          { model: VehicleType, as: "vehicleType" },
          { model: WeightMaster, as: "weight" }
        ],
        transaction
      });

      if (destinationMatrixEntries && destinationMatrixEntries.length > 0) {
        matchedDestinationFound = true;
        let selectedMatrix = null;

        // Sheet 1 (DOMESTIC DESTINATIONS) rows carry a WeightID and no
        // VehicleTypeID; Sheet 2 (ADDITIONAL DESTINATIONS) rows carry a
        // VehicleTypeID and no WeightID (see contract.service.js's
        // processRateMatrixExcel, which imports each sheet this way). A
        // given destination's rows all come from one sheet or the other,
        // so whichever set is present tells us which key - Weight or
        // Vehicle Type - to match this invoice on, alongside Destination.
        const vehicleKeyedEntries = destinationMatrixEntries.filter(m => m.VehicleTypeID !== null);
        const weightKeyedEntries = destinationMatrixEntries.filter(m => m.WeightID !== null);

        if (vehicleKeyedEntries.length > 0) {
          // Sheet 2: match on Destination + Vehicle Type.
          selectedMatrix = vehicleKeyedEntries.find(m => String(m.VehicleTypeID) === String(resolvedVehicleTypeId));
          if (!selectedMatrix) hasVehicleTypeMismatch = true;
        } else if (weightKeyedEntries.length > 0) {
          // Sheet 1: match on Destination + Weight - the nearest weight
          // slab at or above the invoice's actual weight.
          selectedMatrix = weightKeyedEntries
            .filter(m => m.weight && parseFloat(m.weight.Weight || 0) >= actualWeight)
            .sort((a, b) => parseFloat(a.weight.Weight || 0) - parseFloat(b.weight.Weight || 0))[0] || null;

          if (!selectedMatrix) {
            // No slab covers this weight - fall back to the highest
            // available slab rather than leaving the invoice unmatched.
            const validEntries = weightKeyedEntries.filter(m => m.weight && m.weight.Weight !== undefined);
            if (validEntries.length > 0) {
              validEntries.sort((a, b) => parseFloat(b.weight.Weight || 0) - parseFloat(a.weight.Weight || 0));
              selectedMatrix = validEntries[0];
            }
          }
        }

        // Last-resort fallback so any existing rate matrix entry for this
        // destination is used rather than none at all, matching the prior
        // "always resolve to something if entries exist" behavior.
        if (!selectedMatrix) {
          selectedMatrix = destinationMatrixEntries[0];
        }

        if (selectedMatrix) {
          const matrixBaseRate = parseFloat(selectedMatrix.BaseRate || 0);
          calculatedExpectedFreight = matrixBaseRate;
          auditRemarks = `Contract matched successfully. Destination: '${toStation}', Base Rate: Rs ${matrixBaseRate.toFixed(2)}.`;
        }
      }
    }
  }

  let variance = 0;
  let hasContractMatchFailure = false;
  let hasDestinationMismatch = false;

  // Audit decision evaluation tree
  if (!activeContract) {
    hasContractMatchFailure = true;
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `No active contract found for vendor with PAN '${extractedPAN}'.`;
  } else if (hasVehicleTypeNotFound) {
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `Vehicle type is not available in master.`;
  } else if (!destination || !matchedDestinationFound) {
    hasDestinationMismatch = true;
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `Destination '${toStation}' is not available in the contract rate matrix.`;
  } else if (hasVehicleTypeMismatch) {
    finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
    auditRemarks = `Vehicle type or rate capacity mismatch for destination '${toStation}'.`;
  } else {
    variance = freightCharge - calculatedExpectedFreight;
    if (freightCharge <= calculatedExpectedFreight + 1.0 && !hasVehicleTypeMismatch) {
      finalAuditDecision = VERIFICATION_STATUS_APPROVED;
      auditRemarks = `Verification passed successfully against contract rate of Rs ${calculatedExpectedFreight.toFixed(2)}.`;
    } else {
      finalAuditDecision = VERIFICATION_STATUS_DISCREPANCY;
      auditRemarks = `Discrepancy detected! Expected rate: Rs ${calculatedExpectedFreight.toFixed(2)}, Billed: Rs ${freightCharge.toFixed(2)}, Variance: Rs ${variance.toFixed(2)}.`;
    }
  }

  return {
    destination, activeContract, targetContractId, calculatedExpectedFreight,
    finalAuditDecision, auditRemarks, variance,
    hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeMismatch
  };
};

// Applies the Pre-Approved override on top of a computed audit outcome.
// A pre-approved invoice always displays and stores as Pre-Approved,
// regardless of what the automated contract-rate audit found — this is the
// fix for "invoices with a 'pre-approved' selection correctly display the
// status as Pre-Approved." When NOT pre-approved, the genuine audit outcome
// (Approved/Discrepancy) passes through untouched, which is what keeps
// "invoices where contract rates successfully match" accurate.
const applyPreApprovedOverride = (isPreApproved, auditResult) => {
  if (!isPreApproved) return auditResult;

  return {
    ...auditResult,
    finalAuditDecision: VERIFICATION_STATUS_PRE_APPROVED,
    auditRemarks: `Marked as Pre-Approved by uploader. ${auditResult.auditRemarks}`.trim(),
  };
};

// Main controller to process and upload invoices, validate rules, and execute database transactions
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const uploadDocument = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    let invoicesPayload = req.body.invoices;
    if (typeof invoicesPayload === 'string') {
      try {
        invoicesPayload = JSON.parse(invoicesPayload);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid JSON format in invoices payload." });
      }
    }
    const invoiceRows = Array.isArray(invoicesPayload) ? invoicesPayload : [invoicesPayload];

    if (!invoiceRows || invoiceRows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "No invoice records provided." });
    }

<<<<<<< HEAD
    // Fetch default plant fallback if location is not provided
    let defaultPlant = await Plant.findOne({ transaction });
    if (!defaultPlant) {
      defaultPlant = await Plant.create({ PlantCode: "PLT001", PlantName: "N1", IsActive: true }, { transaction });
    }

    // Fetch default status for invoice module
=======
    let defaultPlant = await Plant.findOne({ transaction });
    if (!defaultPlant) {
      defaultPlant = await Plant.create({ PlantCode: "PLT001", PlantName: "Default Plant", IsActive: true }, { transaction });
    }

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    let defaultStatus = await StatusMaster.findOne({ where: { ModuleName: "INVOICE" }, transaction });
    if (!defaultStatus) {
      defaultStatus = await StatusMaster.findOne({ transaction });
      if (!defaultStatus) {
<<<<<<< HEAD
        defaultStatus = await StatusMaster.create({ StatusName: PENDING_VERIFICATION_STATUS_NAME, ModuleName: "INVOICE" }, { transaction });
=======
        defaultStatus = await StatusMaster.create({ StatusName: "Pending Verification", ModuleName: "INVOICE" }, { transaction });
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      }
    }
    const statusIdToUse = defaultStatus.StatusID;

<<<<<<< HEAD
    // Map incoming files by fieldname
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    const filesMap = {};
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        filesMap[file.fieldname] = file;
      });
    } else if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key][0]) {
          filesMap[key] = req.files[key][0];
        }
      });
    }

<<<<<<< HEAD
    // Ensure uploads directory exists
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

<<<<<<< HEAD
    // Loop through each invoice row in the payload
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    for (let i = 0; i < invoiceRows.length; i++) {
      const row = invoiceRows[i];
      const gstNumber = String(row.gstNo || "").trim();
      const invoiceNo = String(row.invoiceNo || "").trim();
<<<<<<< HEAD
      // Bug fix: the Add Invoice grid sends this field as `customerName`
      // (see AddInvoice.jsx payloadRows) - reading `row.CustomerName` here
      // always read undefined, so Customer Name was silently saved as
      // empty on every newly created invoice (updateInvoices already read
      // the correct casing, which is why editing appeared to work).
      const CustomerName = String(row.customerName || "").trim();
      const invoiceDateFormatted = normalizeRequiredDateForDb(row.invoiceDate, "Invoice date");
      const lrDateFormatted = normalizeOptionalDateForDb(row.lrDate);
      const lrNo = String(row.lrNo || "").trim();
      const inputVehicleType = row.vehicleTypeId || row.vehicleType || null;
      // Remarks the user actually typed on the Add Invoice grid. Captured
      // separately from auditRemarks (computed further below) so the user's
      // own input is never silently discarded before it reaches the DB.
      const userRemarks = String(row.remarks || "").trim();

      // Resolve the actual Plants master record for this row up front so
      // PlantID and FromStation can reuse the same single lookup instead of
      // querying the Plants table more than once. Kept separate from the
      // Location resolution below - `row.locationId` is a PlantLocations ID
      // (the Add Invoice Step 1 hierarchy), not a Plants ID, so it should
      // only be used as a last-resort Plants candidate, never as the
      // source of the invoice's actual Location.
      const plantCandidate = row.plantId || row.locationId || defaultPlant.PlantID;
      const resolvedPlant = await resolveValidPlant(plantCandidate, defaultPlant, transaction);
      const resolvedPlantId = resolvedPlant.PlantID;
      const fromStation = resolvedPlant.LocationName || resolvedPlant.PlantName || "";

      // Resolve the real hierarchy Location (PlantLocations) directly by
      // the ID the Add Invoice page actually selected, independent of
      // whichever Plants row resolveValidPlant found. Falls back to the
      // display name the frontend already sent (row.locationName) if the
      // ID doesn't resolve, so the user's on-screen selection is never
      // silently discarded, and only to null if neither is available.
      let resolvedLocationId = null;
      let resolvedLocationName = row.locationName || null;
      if (row.locationId) {
        const locationRecord = await PlantLocation.findByPk(row.locationId, { transaction });
        if (locationRecord) {
          resolvedLocationId = locationRecord.LocationID;
          resolvedLocationName = locationRecord.LocationName;
        }
      }

=======
      const customerName = String(row.customerName || "").trim();
      const invoiceDateFormatted = row.invoiceDate || new Date().toISOString().split('T')[0];
      const lrDateFormatted = row.lrDate || new Date().toISOString().split('T')[0];
      const lrNo = String(row.lrNo || "").trim();
      const vehicleNo = String(row.vehicleNo || "").trim();
      const vehicleTypeId = row.vehicleTypeId || null;
      const locationId = row.locationId || null;
      const fromStation = String(row.fromStation || "").trim();
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      const toStation = String(row.toStation || "").trim();
      const actualWeight = parseFloat(row.actualWeight || 0);
      const freightCharge = parseFloat(row.freightCharge || 0);
      const detainCharge = parseFloat(row.detainCharge || 0);
      const extraCharge = parseFloat(row.extraCharge || 0);
      const totalBilledAmount = parseFloat(row.total || 0);
<<<<<<< HEAD

      let doc1Path = null, doc2Path = null, doc3Path = null;
      let doc1OriginalName = null, doc2OriginalName = null, doc3OriginalName = null;
=======
      const preApproval = String(row.preAppr || "No").trim();

      let doc1Path = null;
      let doc2Path = null;
      let doc3Path = null;

      let doc1OriginalName = null;
      let doc2OriginalName = null;
      let doc3OriginalName = null;
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

      const fileKey1 = `doc1_${i}`;
      const fileKey2 = `doc2_${i}`;
      const fileKey3 = `doc3_${i}`;

<<<<<<< HEAD
      // Handle Document 1 file write
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      if (filesMap[fileKey1]) {
        const file = filesMap[fileKey1];
        doc1OriginalName = file.originalname || 'Document1.pdf';
        const fileExt = path.extname(doc1OriginalName);
        const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
        const uniqueFileName = `inv_${safeInvoiceNo}_doc1_${Date.now()}${fileExt}`;
        const fullPath = path.join(uploadsDir, uniqueFileName);
        fs.writeFileSync(fullPath, file.buffer);
        doc1Path = `uploads/${uniqueFileName}`;
      }

<<<<<<< HEAD
      // Handle Document 2 file write
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      if (filesMap[fileKey2]) {
        const file = filesMap[fileKey2];
        doc2OriginalName = file.originalname || 'Document2.pdf';
        const fileExt = path.extname(doc2OriginalName);
        const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
        const uniqueFileName = `inv_${safeInvoiceNo}_doc2_${Date.now()}${fileExt}`;
        const fullPath = path.join(uploadsDir, uniqueFileName);
        fs.writeFileSync(fullPath, file.buffer);
        doc2Path = `uploads/${uniqueFileName}`;
      }

<<<<<<< HEAD
      // Handle Document 3 file write
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      if (filesMap[fileKey3]) {
        const file = filesMap[fileKey3];
        doc3OriginalName = file.originalname || 'Document3.pdf';
        const fileExt = path.extname(doc3OriginalName);
        const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
        const uniqueFileName = `inv_${safeInvoiceNo}_doc3_${Date.now()}${fileExt}`;
        const fullPath = path.join(uploadsDir, uniqueFileName);
        fs.writeFileSync(fullPath, file.buffer);
        doc3Path = `uploads/${uniqueFileName}`;
      }

      if (!gstNumber || !invoiceNo) continue;

<<<<<<< HEAD
      // --- VENDOR & GST RESOLUTION (shared helper) ---
      const { vendor, vendorGst, extractedPAN } = await resolveVendorAndGst(gstNumber, CustomerName, transaction);

      // --- VEHICLE TYPE VALIDATION LOGIC (shared helper) ---
      const { resolvedVehicleTypeId, hasVehicleTypeNotFound } = await resolveVehicleTypeFromInput(inputVehicleType, transaction);

      const evaluatedDistanceKM = 0;

      // --- CONTRACT-RATE AUDIT (shared helper) ---
      const preApproval = String(row.preAppr || "No").trim();
      const isPreApproved = preApproval.toLowerCase() === "yes" || preApproval === "1" || preApproval === true;

      const rawAuditResult = await computeContractAudit({
        vendorId: vendor.VendorID,
        extractedPAN,
        toStation,
        actualWeight,
        resolvedVehicleTypeId,
        hasVehicleTypeNotFound,
        freightCharge,
        contractId: row.contractId || null
      }, transaction);

      const {
        destination, targetContractId, calculatedExpectedFreight,
        hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeMismatch
      } = rawAuditResult;
      let { finalAuditDecision, auditRemarks, variance } = applyPreApprovedOverride(isPreApproved, rawAuditResult);

      const hasExtraCharge = extraCharge > 0;
      const hasDetainCharge = detainCharge > 0;

      // Send email alert if discrepancies or extra charges are found and not pre-approved.
      // On this initial creation, the confirmation goes to the submitting
      // user's own inbox rather than the location's approval recipient -
      // the approval recipient only gets notified once the invoice is
      // later edited and resubmitted (see updateInvoices).
      let emailStatusLog = "";
      if (!isPreApproved && (hasExtraCharge || hasDetainCharge || hasContractMatchFailure || hasDestinationMismatch || hasVehicleTypeNotFound || hasVehicleTypeMismatch || finalAuditDecision === VERIFICATION_STATUS_DISCREPANCY)) {
        const recipientEmail = req.user?.Email || DEFAULT_NOTIFICATION_EMAIL;

        if (finalAuditDecision === VERIFICATION_STATUS_DISCREPANCY) {
          await safeNotify({
            type: NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
            message: `Discrepancy detected on invoice ${invoiceNo}: ${auditRemarks}`,
          }, transaction);
        }

        const mailSent = await sendAuditNotificationEmail({
          invoiceNo, CustomerName, invoiceDate: invoiceDateFormatted, lrDate: lrDateFormatted, vendorName: vendor.VendorName,
          vendorCode: vendor.VendorCode, gstNumber, lrNo, fromStation, toStation,
          actualWeight, freightCharge, calculatedExpectedFreight, totalBilledAmount,
          variance, finalAuditDecision, auditRemarks, extraCharge, detainCharge,
          hasExtraCharge, hasDetainCharge, hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeNotFound, hasVehicleTypeMismatch
=======
      const extractedPAN = gstNumber.substring(2, 12);

      let vendor = await Vendor.findOne({ where: { PANNo: extractedPAN }, transaction });
      if (!vendor) {
        vendor = await Vendor.create({
          VendorCode: `VND-${Date.now().toString().slice(-6)}`,
          VendorName: customerName || `Auto Synchronized Vendor (${extractedPAN})`,
          PANNo: extractedPAN,
          IsActive: true
        }, { transaction });
      }

      const derivedStateName = getStateFromGST(gstNumber);
      let vendorGst = await VendorGST.findOne({ where: { GSTNumber: gstNumber, VendorID: vendor.VendorID }, transaction });
      if (!vendorGst) {
        vendorGst = await VendorGST.create({
          VendorID: vendor.VendorID,
          GSTNumber: gstNumber,
          StateName: derivedStateName,
          IsDefault: false
        }, { transaction });
      }

      let evaluatedDistanceKM = await getCommercialDrivingDistanceKM(fromStation, toStation);
      const activeContract = await ContractMaster.findOne({ where: { VendorID: vendor.VendorID, Status: "ACTIVE" }, transaction });

      let calculatedExpectedFreight = 0;
      let targetContractId = null;
      let auditRemarks = "";
      let finalAuditDecision = "DISCREPANCY";
      let matchedDestinationFound = false;
      let hasVehicleTypeMismatch = false;

      const destination = await DestinationMaster.findOne({ 
        where: { City: { [Op.like]: toStation.trim() } }, 
        transaction 
      });

      if (activeContract) {
        targetContractId = activeContract.ContractID;

        if (destination) {
          const destinationMatrixEntries = await ContractRateMatrix.findAll({
            where: { 
              ContractID: activeContract.ContractID, 
              DestinationID: destination.DestinationID
            },
            include: [{ model: VehicleType, as: "vehicleType" }],
            transaction
          });

          if (destinationMatrixEntries && destinationMatrixEntries.length > 0) {
            matchedDestinationFound = true;
            let selectedMatrix = null;

            if (vehicleTypeId) {
              selectedMatrix = destinationMatrixEntries.find(m => 
                String(m.VehicleTypeID || m.vehicleType?.VehicleTypeID) === String(vehicleTypeId) &&
                parseFloat(m.vehicleType?.Capacity || 0) >= actualWeight
              );
              if (!selectedMatrix) hasVehicleTypeMismatch = true;
            }

            if (!selectedMatrix) {
              selectedMatrix = destinationMatrixEntries.find(m => m.vehicleType && parseFloat(m.vehicleType.Capacity || 0) >= actualWeight);
            }

            if (!selectedMatrix) {
              const validEntries = destinationMatrixEntries.filter(m => m.vehicleType && m.vehicleType.Capacity !== undefined);
              if (validEntries.length > 0) {
                validEntries.sort((a, b) => parseFloat(b.vehicleType.Capacity || 0) - parseFloat(a.vehicleType.Capacity || 0));
                selectedMatrix = validEntries[0];
              } else {
                selectedMatrix = destinationMatrixEntries[0];
              }
            }

            if (selectedMatrix) {
              const matrixBaseRate = parseFloat(selectedMatrix.BaseRate || 0);
              calculatedExpectedFreight = matrixBaseRate;
              auditRemarks = `Contract matched successfully. Destination: '${toStation}', Base Rate: Rs ${matrixBaseRate.toFixed(2)}.`;
            }
          }
        }
      }

      let variance = 0;
      let hasContractMatchFailure = false;
      let hasDestinationMismatch = false;

      if (!activeContract) {
        hasContractMatchFailure = true;
        finalAuditDecision = "DISCREPANCY";
        auditRemarks = `No active contract found for vendor with PAN '${extractedPAN}'.`;
      } else if (!destination || !matchedDestinationFound) {
        hasDestinationMismatch = true;
        finalAuditDecision = "DISCREPANCY";
        auditRemarks = `Destination '${toStation}' is not available in the contract rate matrix.`;
      } else if (hasVehicleTypeMismatch) {
        finalAuditDecision = "DISCREPANCY";
        auditRemarks = `Vehicle type or rate capacity mismatch for destination '${toStation}'.`;
      } else {
        variance = freightCharge - calculatedExpectedFreight;
        if (freightCharge <= calculatedExpectedFreight + 1.0 && !hasVehicleTypeMismatch) {
          finalAuditDecision = "APPROVED";
          auditRemarks = `Verification passed successfully against contract rate of Rs ${calculatedExpectedFreight.toFixed(2)}.`;
        } else {
          finalAuditDecision = "DISCREPANCY";
          auditRemarks = `Discrepancy detected! Expected rate: Rs ${calculatedExpectedFreight.toFixed(2)}, Billed: Rs ${freightCharge.toFixed(2)}, Variance: Rs ${variance.toFixed(2)}.`;
        }
      }

      const hasExtraCharge = extraCharge > 0;
      const hasDetainCharge = detainCharge > 0;
      const isPreApproved = preApproval.toLowerCase() === "yes" || preApproval === "1" || preApproval === true;

      let emailStatusLog = "";
      if (!isPreApproved && (hasExtraCharge || hasDetainCharge || hasContractMatchFailure || hasDestinationMismatch || hasVehicleTypeMismatch || finalAuditDecision === "DISCREPANCY")) {
        let recipientEmail = process.env.EMAIL_USER || "dhvanidr1204@gmail.com";
        if (locationId) {
          const approvalConfig = await sequelize.query(`
            SELECT TOP 1 PrimaryEmail, OptionalEmail, IsPrimaryActive, IsOptionalActive 
            FROM ApprovalConfig 
            WHERE LocationID = :locationId
          `, {
            replacements: { locationId },
            type: sequelize.QueryTypes.SELECT,
            transaction
          });

          if (approvalConfig && approvalConfig.length > 0) {
            if (approvalConfig[0].IsPrimaryActive && approvalConfig[0].PrimaryEmail) {
              recipientEmail = approvalConfig[0].PrimaryEmail;
            } else if (approvalConfig[0].IsOptionalActive && approvalConfig[0].OptionalEmail) {
              recipientEmail = approvalConfig[0].OptionalEmail;
            }
          }
        }

        const mailSent = await sendAuditNotificationEmail({
          invoiceNo, customerName, invoiceDate: invoiceDateFormatted, lrDate: lrDateFormatted, vendorName: vendor.VendorName,
          vendorCode: vendor.VendorCode, gstNumber, lrNo, vehicleNo, fromStation, toStation,
          actualWeight, freightCharge, calculatedExpectedFreight, totalBilledAmount,
          variance, finalAuditDecision, auditRemarks, extraCharge, detainCharge,
          hasExtraCharge, hasDetainCharge, hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeMismatch
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        }, recipientEmail, [
          doc1Path ? { filePath: doc1Path, originalName: doc1OriginalName } : null, 
          doc2Path ? { filePath: doc2Path, originalName: doc2OriginalName } : null, 
          doc3Path ? { filePath: doc3Path, originalName: doc3OriginalName } : null
        ]);

        if (mailSent) {
          emailStatusLog = ` | Mail Sent to: ${recipientEmail}`;
          auditRemarks += emailStatusLog;
<<<<<<< HEAD

          await safeNotify({
            type: NOTIFICATION_TYPE_EMAIL_SENT,
            message: `Audit notification email sent for invoice ${invoiceNo} to ${recipientEmail}.`,
          }, transaction);
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        }
      }

      const totalExpectedPrice = calculatedExpectedFreight + detainCharge + extraCharge;

<<<<<<< HEAD
      // The Remarks column stores what the user actually typed in the Add
      // Invoice grid; the system's own audit outcome (auditRemarks) is
      // appended after it for context instead of overwriting it, so nothing
      // the user entered is ever lost. If the user left Remarks blank, the
      // audit outcome alone is stored, same as before.
      const remarksToStore = userRemarks
        ? (auditRemarks ? `${userRemarks} | Audit: ${auditRemarks}` : userRemarks)
        : auditRemarks;

      // --- INSERT INTO INVOICE HEADER TABLE ---
      let insertedHeader;
      try {
        [insertedHeader] = await sequelize.query(`
          INSERT INTO [InvoiceHeader] (
            [InvoiceNumber], [CustomerName], [InvoiceDate], [LRDate], [VendorID], [VendorGSTID], 
            [PlantID], [LocationID], [LocationName], [ContractID], [LRNumber], [VehicleTypeID],
            [TotalWeight], [DistanceKM], [BasicFreight], [DetainCharges], 
            [ExtraCharges], [TotalInvoiceAmount], [InvoiceStatusID], [UploadedDate],
            [FromStation], [ToStation], [Remarks], [IsPreApproved], [Doc1Path], [Doc2Path], [Doc3Path]
          )
          OUTPUT INSERTED.[InvoiceID]
          VALUES (
            :invoiceNo, :CustomerName, :invoiceDate, :lrDate, :vendorId, :vendorGstId,
            :plantId, :locationId, :locationName, :contractId, :lrNo, :vehicleTypeId,
            :actualWeight, :distanceKm, :basicFreight, :detainCharges,
            :extraCharges, :totalAmount, :statusId, GETDATE(),
            :locationName, :toStation, :remarks, :isPreApproved, :doc1, :doc2, :doc3
          );
        `, {
          replacements: {
            invoiceNo, CustomerName, invoiceDate: invoiceDateFormatted, lrDate: lrDateFormatted, 
            vendorId: vendor.VendorID, vendorGstId: vendorGst.VendorGSTID,
            plantId: resolvedPlantId, locationId: resolvedLocationId, locationName: resolvedLocationName, contractId: targetContractId, lrNo, 
            vehicleTypeId: resolvedVehicleTypeId, actualWeight, distanceKm: evaluatedDistanceKM, 
            basicFreight: freightCharge, detainCharges: detainCharge, extraCharges: extraCharge, 
            totalAmount: totalBilledAmount, statusId: statusIdToUse, fromStation, toStation, 
            remarks: remarksToStore, isPreApproved: isPreApproved ? 1 : 0, doc1: doc1Path, doc2: doc2Path, doc3: doc3Path
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        });
      } catch (insertError) {
        if (isForeignKeyViolationForTable(insertError, "Plants")) {
          throw new Error(INVALID_PLANT_LOCATION_MESSAGE);
        }
        throw insertError;
      }

      const newInvoiceID = insertedHeader[0].InvoiceID;

      await safeNotify({
        type: NOTIFICATION_TYPE_INVOICE_CREATED,
        message: `New invoice ${invoiceNo} uploaded for ${CustomerName || vendor.VendorName}.`,
        relatedInvoiceId: newInvoiceID,
      }, transaction);

      // Create invoice item record
=======
      const [insertedHeader] = await sequelize.query(`
        INSERT INTO [InvoiceHeader] (
          [InvoiceNumber], [CustomerName], [InvoiceDate], [LRDate], [VendorID], [VendorGSTID], 
          [PlantID], [ContractID], [LRNumber], [VehicleNumber], [VehicleTypeID],
          [TotalWeight], [DistanceKM], [BasicFreight], [DetainCharges], 
          [ExtraCharges], [TotalInvoiceAmount], [InvoiceStatusID], [UploadedDate],
          [FromStation], [ToStation], [Remarks], [Doc1Path], [Doc2Path], [Doc3Path]
        )
        OUTPUT INSERTED.[InvoiceID]
        VALUES (
          :invoiceNo, :customerName, :invoiceDate, :lrDate, :vendorId, :vendorGstId,
          :plantId, :contractId, :lrNo, :vehicleNo, :vehicleTypeId,
          :actualWeight, :distanceKm, :basicFreight, :detainCharges,
          :extraCharges, :totalAmount, :statusId, GETDATE(),
          :fromStation, :toStation, :remarks, :doc1, :doc2, :doc3
        );
      `, {
        replacements: {
          invoiceNo, customerName, invoiceDate: invoiceDateFormatted, lrDate: lrDateFormatted, vendorId: vendor.VendorID,
          vendorGstId: vendorGst.VendorGSTID, plantId: defaultPlant.PlantID,
          contractId: targetContractId, lrNo, vehicleNo, vehicleTypeId: vehicleTypeId || null,
          actualWeight, distanceKm: evaluatedDistanceKM, basicFreight: freightCharge,
          detainCharges: detainCharge, extraCharges: extraCharge, totalAmount: totalBilledAmount,
          statusId: statusIdToUse, fromStation, toStation, remarks: auditRemarks,
          doc1: doc1Path, doc2: doc2Path, doc3: doc3Path
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      });

      const newInvoiceID = insertedHeader[0].InvoiceID;

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      await InvoiceItem.create({
        InvoiceID: newInvoiceID,
        DestinationID: destination ? destination.DestinationID : null,
        ActualWeight: actualWeight,
        DistanceKM: evaluatedDistanceKM, 
        Rate: actualWeight > 0 ? (calculatedExpectedFreight / actualWeight) : 0, 
        FreightAmount: freightCharge
      }, { transaction });

<<<<<<< HEAD
      // Create invoice verification audit record
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      await sequelize.query(`
        INSERT INTO [InvoiceVerification] (
          [InvoiceID], [ContractID], [ExpectedAmount], 
          [InvoiceAmount], [DifferenceAmount], [VerificationStatus], [VerifiedDate]
        )
        VALUES (:invoiceId, :contractId, :expected, :actual, :variance, :status, GETDATE());
      `, {
        replacements: {
          invoiceId: newInvoiceID, contractId: targetContractId,
          expected: totalExpectedPrice, actual: totalBilledAmount,
          variance, status: finalAuditDecision
        },
        type: sequelize.QueryTypes.INSERT,
        transaction
      });
    }

    await transaction.commit();
<<<<<<< HEAD
    return res.status(201).json({
      success: true,
      message: "Invoices processed successfully with files saved and mail sent with original names!",
    });
=======
    return res.status(200).json({ message: "Invoices processed successfully with files saved and mail sent with original names!" });
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

  } catch (error) {
    if (transaction && !transaction.finished) {
      try { await transaction.rollback(); } catch(e) { console.error("Rollback error", e); }
    }
    console.error("CRITICAL UPLOAD ERROR:", error.original || error);
<<<<<<< HEAD
    const isClientError = /required and must be a valid date|Invalid JSON format in invoices payload|No invoice records provided/i.test(
      error.message || ""
    );
    return res.status(isClientError ? 400 : 500).json({
      success: false,
=======
    return res.status(500).json({ 
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      message: error.message || "Fatal server error during processing.",
      errorDetails: error.original?.message || error.sqlMessage || error.toString()
    });
  }
};

<<<<<<< HEAD
// Bulk-edit endpoint powering the Edit Invoice page. Accepts the same row
// shape the Add Invoice grid sends (plus a required `invoiceId` per row),
// and lets the user update one or many invoices' fields in a single request
// — mirroring the Add Invoice layout, adapted for editing. Each row's
// contract-rate audit is recomputed via the exact same shared helpers
// uploadDocument uses, so the "matching status" stays accurate after an
// edit too (e.g. changing the destination or freight charge on an existing
// invoice correctly re-evaluates Approved/Discrepancy/Pre-Approved).
const updateInvoices = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    let invoicesPayload = req.body.invoices;
    if (typeof invoicesPayload === 'string') {
      try {
        invoicesPayload = JSON.parse(invoicesPayload);
      } catch (parseError) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid JSON format in invoices payload." });
      }
    }
    const invoiceRows = Array.isArray(invoicesPayload) ? invoicesPayload : [invoicesPayload];

    if (!invoiceRows || invoiceRows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "No invoice records provided." });
    }

    let defaultPlant = await Plant.findOne({ transaction });
    if (!defaultPlant) {
      defaultPlant = await Plant.create({ PlantCode: "PLT001", PlantName: "N1", IsActive: true }, { transaction });
    }

    // Map incoming files by fieldname (mirrors uploadDocument). Only
    // present when the request is multipart - i.e. when at least one row
    // has a new attachment to upload via the Edit Invoice page's "+ Upload"
    // control (see EditInvoice.jsx). Existing Doc1/2/3Path values are never
    // touched by this - see the per-row write-only-if-empty checks below.
    const filesMap = {};
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        filesMap[file.fieldname] = file;
      });
    } else if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key][0]) {
          filesMap[key] = req.files[key][0];
        }
      });
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const updatedIds = [];

    for (let i = 0; i < invoiceRows.length; i++) {
      const row = invoiceRows[i];
      const invoiceId = row.invoiceId || row.InvoiceID;
      if (!invoiceId) {
        throw new Error("Every row being edited must include its invoiceId.");
      }

      const existingInvoice = await InvoiceHeader.findByPk(invoiceId, { transaction });
      if (!existingInvoice) {
        throw new Error(`Invoice #${invoiceId} was not found.`);
      }

      // New attachment uploads: a slot is only ever written if it doesn't
      // already have a file - an existing Doc1/2/3Path is locked and can
      // never be replaced or cleared from this endpoint (the frontend only
      // ever targets an already-empty slot with a new file; this check is
      // just defense in depth against stale client state).
      let newDoc1Path = null, newDoc2Path = null, newDoc3Path = null;
      if (!existingInvoice.Doc1Path && filesMap[`doc1_${i}`]) {
        newDoc1Path = writeUploadedInvoiceFile(filesMap[`doc1_${i}`], invoiceId, "doc1", uploadsDir);
      }
      if (!existingInvoice.Doc2Path && filesMap[`doc2_${i}`]) {
        newDoc2Path = writeUploadedInvoiceFile(filesMap[`doc2_${i}`], invoiceId, "doc2", uploadsDir);
      }
      if (!existingInvoice.Doc3Path && filesMap[`doc3_${i}`]) {
        newDoc3Path = writeUploadedInvoiceFile(filesMap[`doc3_${i}`], invoiceId, "doc3", uploadsDir);
      }

      const gstNumber = String(row.gstNo || "").trim().toUpperCase();
      const CustomerName = String(row.customerName || existingInvoice.CustomerName || "").trim();
      const invoiceDateFormatted = normalizeOptionalDateForDb(row.invoiceDate) || existingInvoice.InvoiceDate;
      const lrDateFormatted = normalizeOptionalDateForDb(row.lrDate);
      const lrNo = String(row.lrNo || existingInvoice.LRNumber || "").trim();
      const inputVehicleType = row.vehicleTypeId || row.vehicleType || existingInvoice.VehicleTypeID || null;
      const toStation = String(row.toStation || existingInvoice.ToStation || "").trim();
      const actualWeight = row.actualWeight !== undefined ? parseFloat(row.actualWeight || 0) : parseFloat(existingInvoice.TotalWeight || 0);
      const freightCharge = row.freightCharge !== undefined ? parseFloat(row.freightCharge || 0) : parseFloat(existingInvoice.BasicFreight || 0);
      const detainCharge = row.detainCharge !== undefined ? parseFloat(row.detainCharge || 0) : parseFloat(existingInvoice.DetainCharges || 0);
      const extraCharge = row.extraCharge !== undefined ? parseFloat(row.extraCharge || 0) : parseFloat(existingInvoice.ExtraCharges || 0);
      const totalBilledAmount = row.total !== undefined ? parseFloat(row.total || 0) : parseFloat(existingInvoice.TotalInvoiceAmount || 0);
      const userRemarks = String(row.remarks !== undefined ? row.remarks : "").trim();
      const preApproval = String(row.preAppr !== undefined ? row.preAppr : (existingInvoice.IsPreApproved ? "Yes" : "No")).trim();
      const isPreApproved = preApproval.toLowerCase() === "yes" || preApproval === "1" || preApproval === true;

      // Vendor/GST: only re-resolve if a GST number was actually provided
      // for this row; otherwise keep the invoice's existing vendor linkage.
      let vendor = { VendorID: existingInvoice.VendorID, VendorName: null };
      let vendorGst = { VendorGSTID: existingInvoice.VendorGSTID };
      let extractedPAN = "";
      if (gstNumber) {
        const resolved = await resolveVendorAndGst(gstNumber, CustomerName, transaction);
        vendor = resolved.vendor;
        vendorGst = resolved.vendorGst;
        extractedPAN = resolved.extractedPAN;
      }

      const { resolvedVehicleTypeId, hasVehicleTypeNotFound } = await resolveVehicleTypeFromInput(inputVehicleType, transaction);

      // Resolve the Plants row (for FromStation) - mirrors uploadDocument:
      // row.plantId here is a genuine Plants.PlantID (the Edit Invoice
      // page's Location dropdown picks a real Plants row directly), kept
      // separate from Location resolution below.
      const plantCandidate = row.plantId || row.locationId || existingInvoice.PlantID;
      const resolvedPlant = await resolveValidPlant(plantCandidate, defaultPlant, transaction);
      const resolvedPlantId = resolvedPlant.PlantID;
      const fromStation = resolvedPlant.LocationName || resolvedPlant.PlantName || existingInvoice.FromStation || "";

      // Resolve the real hierarchy Location (PlantLocations): prefer an
      // explicit locationId on the request (matches Add Invoice's payload
      // shape), otherwise use whichever Location the selected Plant is
      // itself linked to (Plants.LocationID - what the Edit Invoice page's
      // Plants-master Location dropdown actually drives). Falls back to
      // the invoice's existing Location if neither resolves, so a save
      // that doesn't touch Location never clears it.
      const locationIdCandidate = row.locationId || resolvedPlant.LocationID || null;
      let resolvedLocationId = existingInvoice.LocationID || null;
      let resolvedLocationName = row.locationName || existingInvoice.LocationName || null;
      if (locationIdCandidate) {
        const locationRecord = await PlantLocation.findByPk(locationIdCandidate, { transaction });
        if (locationRecord) {
          resolvedLocationId = locationRecord.LocationID;
          resolvedLocationName = locationRecord.LocationName;
        }
      }

      const rawAuditResult = await computeContractAudit({
        vendorId: vendor.VendorID,
        extractedPAN,
        toStation,
        actualWeight,
        resolvedVehicleTypeId,
        hasVehicleTypeNotFound,
        freightCharge,
        contractId: row.contractId || null
      }, transaction);

      const {
        destination, targetContractId, calculatedExpectedFreight,
        hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeMismatch
      } = rawAuditResult;
      let { finalAuditDecision, auditRemarks, variance } = applyPreApprovedOverride(isPreApproved, rawAuditResult);

      const hasExtraCharge = extraCharge > 0;
      const hasDetainCharge = detainCharge > 0;

      // Send email alert if discrepancies or extra charges are found and not
      // pre-approved. Unlike the initial creation (which confirms to the
      // submitting user), a resubmission on edit routes to the location's
      // approval recipient, mirroring the same rule/recipient lookup
      // uploadDocument used for its own submission.
      let emailStatusLog = "";
      if (!isPreApproved && (hasExtraCharge || hasDetainCharge || hasContractMatchFailure || hasDestinationMismatch || hasVehicleTypeNotFound || hasVehicleTypeMismatch || finalAuditDecision === VERIFICATION_STATUS_DISCREPANCY)) {
        const recipientEmail = await getRecipientEmailForLocation(resolvedLocationId, transaction);

        if (finalAuditDecision === VERIFICATION_STATUS_DISCREPANCY) {
          await safeNotify({
            type: NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
            message: `Discrepancy detected on invoice ${existingInvoice.InvoiceNumber}: ${auditRemarks}`,
          }, transaction);
        }

        const mailSent = await sendAuditNotificationEmail({
          invoiceNo: existingInvoice.InvoiceNumber, CustomerName, invoiceDate: invoiceDateFormatted, lrDate: lrDateFormatted,
          vendorName: vendor.VendorName, vendorCode: vendor.VendorCode, gstNumber, lrNo, fromStation, toStation,
          actualWeight, freightCharge, calculatedExpectedFreight, totalBilledAmount,
          variance, finalAuditDecision, auditRemarks, extraCharge, detainCharge,
          hasExtraCharge, hasDetainCharge, hasContractMatchFailure, hasDestinationMismatch, hasVehicleTypeNotFound, hasVehicleTypeMismatch
        }, recipientEmail);

        if (mailSent) {
          emailStatusLog = ` | Mail Sent to: ${recipientEmail}`;
          auditRemarks += emailStatusLog;

          await safeNotify({
            type: NOTIFICATION_TYPE_EMAIL_SENT,
            message: `Audit notification email sent for invoice ${existingInvoice.InvoiceNumber} to ${recipientEmail}.`,
          }, transaction);
        }
      }

      const totalExpectedPrice = calculatedExpectedFreight + detainCharge + extraCharge;

      const remarksToStore = userRemarks
        ? (auditRemarks ? `${userRemarks} | Audit: ${auditRemarks}` : userRemarks)
        : (auditRemarks || existingInvoice.Remarks);

      await existingInvoice.update({
        CustomerName,
        InvoiceDate: invoiceDateFormatted,
        LRDate: lrDateFormatted,
        LRNumber: lrNo,
        VendorID: vendor.VendorID,
        VendorGSTID: vendorGst.VendorGSTID,
        PlantID: resolvedPlantId,
        LocationID: resolvedLocationId,
        LocationName: resolvedLocationName,
        ContractID: targetContractId,
        VehicleTypeID: resolvedVehicleTypeId,
        TotalWeight: actualWeight,
        BasicFreight: freightCharge,
        DetainCharges: detainCharge,
        ExtraCharges: extraCharge,
        TotalInvoiceAmount: totalBilledAmount,
        FromStation: fromStation,
        ToStation: toStation,
        Remarks: remarksToStore,
        IsPreApproved: isPreApproved,
        // Only ever set when that slot was previously empty (see the
        // write-only-if-empty checks above) - an existing attachment is
        // never included here, so it can never be replaced or cleared.
        ...(newDoc1Path ? { Doc1Path: newDoc1Path } : {}),
        ...(newDoc2Path ? { Doc2Path: newDoc2Path } : {}),
        ...(newDoc3Path ? { Doc3Path: newDoc3Path } : {}),
      }, { transaction });

      // Keep InvoiceVerification in sync with the freshly recomputed audit
      // outcome — update the existing row if one exists, otherwise create it.
      const existingVerification = await InvoiceVerification.findOne({ where: { InvoiceID: invoiceId }, transaction });
      if (existingVerification) {
        await existingVerification.update({
          ContractID: targetContractId,
          ExpectedAmount: totalExpectedPrice,
          InvoiceAmount: totalBilledAmount,
          DifferenceAmount: variance,
          VerificationStatus: finalAuditDecision,
          VerifiedDate: sequelize.literal("GETDATE()"),
        }, { transaction });
      } else {
        await InvoiceVerification.create({
          InvoiceID: invoiceId,
          ContractID: targetContractId,
          ExpectedAmount: totalExpectedPrice,
          InvoiceAmount: totalBilledAmount,
          DifferenceAmount: variance,
          VerificationStatus: finalAuditDecision,
          VerifiedDate: sequelize.literal("GETDATE()"),
        }, { transaction });
      }

      updatedIds.push(invoiceId);
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: `${updatedIds.length} invoice(s) updated successfully.`,
      updatedIds
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      try { await transaction.rollback(); } catch (e) { console.error("Rollback error", e); }
    }
    console.error("INVOICE UPDATE ERROR:", error.original || error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update invoice(s).",
    });
  }
};

module.exports = { uploadDocument, sendSelectedInvoicesMail, updateInvoices };
=======
module.exports = { uploadDocument };
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
