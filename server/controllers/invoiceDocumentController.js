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
  Plant,

  StatusMaster
} = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize"); 
const axios = require("axios");
const nodemailer = require("nodemailer");
const fs = require('fs');
const path = require('path');

const geoCache = {};


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


const getStateFromGST = (gstNumber) => {
  if (!gstNumber || typeof gstNumber !== "string" || gstNumber.length < 2) return "Gujarat";
  const stateCode = gstNumber.substring(0, 2);
  return GST_STATE_MAP[stateCode] || "Gujarat";
};

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

    pass: process.env.EMAIL_PASS || ""
  }
});


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

                ${invoiceData.hasVehicleTypeMismatch ? `<li><strong>Vehicle Type / Rate Mismatch:</strong> Mismatch detected in vehicle type capacity or destination rate matrix.</li>` : ""}
              </ul>
            </div>

            <div class="section-title">📋 Invoice Summary Details</div>
            <table class="info-table">
              <tr><td class="label">Invoice Number</td><td><strong>${invoiceData.invoiceNo}</strong></td></tr>
              <tr><td class="label">Customer Name</td><td>${invoiceData.customerName}</td></tr>

              <tr><td class="label">Invoice Date</td><td>${invoiceData.invoiceDate}</td></tr>
              <tr><td class="label">LR Date</td><td>${invoiceData.lrDate}</td></tr>
              <tr><td class="label">Vendor Name</td><td>${invoiceData.vendorName} (${invoiceData.vendorCode})</td></tr>
              <tr><td class="label">GST Number</td><td>${invoiceData.gstNumber}</td></tr>
              <tr><td class="label">LR Number / Vehicle</td><td>${invoiceData.lrNo} / ${invoiceData.vehicleNo}</td></tr>
              <tr><td class="label">Route</td><td>${invoiceData.fromStation} → ${invoiceData.toStation}</td></tr>

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
      from: process.env.EMAIL_USER || "dhvanidr1204@gmail.com",

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

    let defaultPlant = await Plant.findOne({ transaction });
    if (!defaultPlant) {
      defaultPlant = await Plant.create({ PlantCode: "PLT001", PlantName: "Default Plant", IsActive: true }, { transaction });
    }


    let defaultStatus = await StatusMaster.findOne({ where: { ModuleName: "INVOICE" }, transaction });
    if (!defaultStatus) {
      defaultStatus = await StatusMaster.findOne({ transaction });
      if (!defaultStatus) {
        defaultStatus = await StatusMaster.create({ StatusName: "Pending Verification", ModuleName: "INVOICE" }, { transaction });

      }
    }
    const statusIdToUse = defaultStatus.StatusID;


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


    for (let i = 0; i < invoiceRows.length; i++) {
      const row = invoiceRows[i];
      const gstNumber = String(row.gstNo || "").trim();
      const invoiceNo = String(row.invoiceNo || "").trim();
      const customerName = String(row.customerName || "").trim();
      const invoiceDateFormatted = row.invoiceDate || new Date().toISOString().split('T')[0];
      const lrDateFormatted = row.lrDate || new Date().toISOString().split('T')[0];
      const lrNo = String(row.lrNo || "").trim();
      const vehicleNo = String(row.vehicleNo || "").trim();
      const vehicleTypeId = row.vehicleTypeId || null;
      const locationId = row.locationId || null;
      const fromStation = String(row.fromStation || "").trim();

      const toStation = String(row.toStation || "").trim();
      const actualWeight = parseFloat(row.actualWeight || 0);
      const freightCharge = parseFloat(row.freightCharge || 0);
      const detainCharge = parseFloat(row.detainCharge || 0);
      const extraCharge = parseFloat(row.extraCharge || 0);
      const totalBilledAmount = parseFloat(row.total || 0);
      const preApproval = String(row.preAppr || "No").trim();

      let doc1Path = null;
      let doc2Path = null;
      let doc3Path = null;

      let doc1OriginalName = null;
      let doc2OriginalName = null;
      let doc3OriginalName = null;


      const fileKey1 = `doc1_${i}`;
      const fileKey2 = `doc2_${i}`;
      const fileKey3 = `doc3_${i}`;


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

        }, recipientEmail, [
          doc1Path ? { filePath: doc1Path, originalName: doc1OriginalName } : null, 
          doc2Path ? { filePath: doc2Path, originalName: doc2OriginalName } : null, 
          doc3Path ? { filePath: doc3Path, originalName: doc3OriginalName } : null
        ]);

        if (mailSent) {
          emailStatusLog = ` | Mail Sent to: ${recipientEmail}`;
          auditRemarks += emailStatusLog;

        }
      }

      const totalExpectedPrice = calculatedExpectedFreight + detainCharge + extraCharge;

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


      await InvoiceItem.create({
        InvoiceID: newInvoiceID,
        DestinationID: destination ? destination.DestinationID : null,
        ActualWeight: actualWeight,
        DistanceKM: evaluatedDistanceKM, 
        Rate: actualWeight > 0 ? (calculatedExpectedFreight / actualWeight) : 0, 
        FreightAmount: freightCharge
      }, { transaction });


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
    return res.status(200).json({ message: "Invoices processed successfully with files saved and mail sent with original names!" });


  } catch (error) {
    if (transaction && !transaction.finished) {
      try { await transaction.rollback(); } catch(e) { console.error("Rollback error", e); }
    }
    console.error("CRITICAL UPLOAD ERROR:", error.original || error);
    return res.status(500).json({ 

      message: error.message || "Fatal server error during processing.",
      errorDetails: error.original?.message || error.sqlMessage || error.toString()
    });
  }
};

module.exports = { uploadDocument };

