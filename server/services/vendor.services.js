const { Op } = require("sequelize");
const { Vendor, VendorGST, sequelize } = require("../models");

/**
 * Helper function to derive Indian State name from the first 2 digits of a GST number
 */
const getStateFromGST = (gstNumber) => {
  if (!gstNumber || typeof gstNumber !== "string" || gstNumber.length < 2) return "Other State";
  
  const stateCode = gstNumber.substring(0, 2);
  const stateMapping = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
    "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
  };

  return stateMapping[stateCode] || "Other State";
};

<<<<<<< HEAD
/**
 * Create a new vendor along with their associated GST details using a transaction
 */
const createVendor = async (vendorData, transaction = null) => {
  const isExternalTransaction = !!transaction;
  const t = transaction || (await sequelize.transaction());

  try {
    // 1. Validate required fields or auto-generate VendorCode if missing
    let vendorCode = vendorData.VendorCode ? vendorData.VendorCode.trim() : "";
    
    if (!vendorCode) {
      // Auto-generate unique vendor code using timestamp or name initials
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const prefix = vendorData.VendorName ? vendorData.VendorName.substring(0, 3).toUpperCase() : "VEN";
      vendorCode = `${prefix}-${randomSuffix}`;
    }

    if (!vendorData.VendorName) {
      throw new Error("Vendor Name is a required field.");
    }

    // 2. Check if VendorCode already exists
    const existingCode = await Vendor.findOne({
      where: { VendorCode: vendorCode },
      transaction: t,
    });
    
    if (existingCode) {
      throw new Error(`Vendor Code '${vendorCode}' already exists.`);
    }

    // 3. Create Main Vendor Record
    const vendor = await Vendor.create(
      {
        VendorCode: vendorCode,
        VendorName: vendorData.VendorName,
        Address: vendorData.Address || null,
        ContactPerson: vendorData.ContactPerson || null,
        Email: vendorData.Email || null,
        MobileNo: vendorData.MobileNo ? String(vendorData.MobileNo) : null,
        PANNo: vendorData.PANNo || null,
        IsActive: vendorData.IsActive !== undefined ? Boolean(vendorData.IsActive) : true,
      },
      { transaction: t }
    );

    // 4. Handle multiple GST numbers if provided in request body
    const incomingGst = vendorData.gstNumbers || vendorData.gstDetails;
    if (incomingGst && Array.isArray(incomingGst) && incomingGst.length > 0) {
      const cleanGstList = incomingGst
        .filter((item) => {
          const gstVal = typeof item === "string" ? item : item.GSTNumber;
          return gstVal && typeof gstVal === "string" && gstVal.trim() !== "";
        })
        .map((item, index) => {
          const gstNumber = (typeof item === "string" ? item : item.GSTNumber).trim();
          return {
            VendorID: vendor.VendorID,
            GSTNumber: gstNumber,
            StateName: typeof item === "object" && item.StateName ? item.StateName : getStateFromGST(gstNumber),
            IsDefault: typeof item === "object" && item.IsDefault !== undefined ? Boolean(item.IsDefault) : index === 0,
          };
        });

      if (cleanGstList.length > 0) {
        await VendorGST.bulkCreate(cleanGstList, { transaction: t });
      }
    }

    if (!isExternalTransaction) {
      await t.commit();
    }

    // Return the newly created vendor with their GST records included
    return await getVendorById(vendor.VendorID);
  } catch (error) {
    if (!isExternalTransaction) {
      await t.rollback();
    }
    throw error;
  }
=======
const createVendor = async (vendorData, transaction = null) => {
  return Vendor.create(vendorData, { transaction });
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
};

const createVendorGST = async (gstList, transaction = null) => {
  return VendorGST.bulkCreate(gstList, { transaction });
};

const findVendorByPAN = async (panNo, transaction = null) => {
  return Vendor.findOne({
    where: { PANNo: panNo },
    transaction,
  });
};

const findVendorByCode = async (vendorCode, transaction = null) => {
  return Vendor.findOne({
    where: { VendorCode: vendorCode },
    transaction,
  });
};

const findGST = async (gstNumber, transaction = null) => {
  return VendorGST.findOne({
    where: { GSTNumber: gstNumber },
    transaction,
  });
};

const getVendorById = async (vendorId, transaction = null) => {
  return Vendor.findOne({
    where: { VendorID: vendorId },
    include: [
      {
        model: VendorGST,
        as: "gstNumbers",
        required: false,
      },
    ],
    transaction,
  });
};

const getAllVendors = async ({
  page = 1,
  pageSize = 10,
  search = "",
  sortField = "VendorID",
  sortOrder = "DESC",
}) => {
  const offset = (Number(page) - 1) * Number(pageSize);

  const allowedSortFields = [
    "VendorID",
    "VendorCode",
    "VendorName",
    "PANNo",
    "Email",
    "MobileNo",
    "CreatedAt",
    "IsActive",
  ];

  if (!allowedSortFields.includes(sortField)) {
    sortField = "VendorID";
  }

  sortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const where = {};

  if (search) {
    where[Op.or] = [
      { VendorName: { [Op.like]: `%${search}%` } },
      { VendorCode: { [Op.like]: `%${search}%` } },
      { PANNo: { [Op.like]: `%${search}%` } },
      { MobileNo: { [Op.like]: `%${search}%` } },
      { Email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Vendor.findAndCountAll({
    where,
    include: [
      {
        model: VendorGST,
        as: "gstNumbers",
        required: false,
      },
    ],
    order: [[sortField, sortOrder]],
    offset,
    limit: Number(pageSize),
    distinct: true,
    subQuery: false,
  });

  return {
    totalRecords: count,
    page: Number(page),
    pageSize: Number(pageSize),
    data: rows,
  };
};

const updateVendor = async (vendorId, vendorData, transaction = null) => {
  const isExternalTransaction = !!transaction;
  const t = transaction || (await sequelize.transaction());

  try {
    // 1. Main Vendor Details Update Karo
    await Vendor.update(
      {
        VendorName: vendorData.VendorName,
        Address: vendorData.Address,
        ContactPerson: vendorData.ContactPerson,
        Email: vendorData.Email,
        MobileNo: vendorData.MobileNo ? String(vendorData.MobileNo) : null,
        PANNo: vendorData.PANNo,
        IsActive: vendorData.IsActive !== undefined ? Boolean(vendorData.IsActive) : true,
      },
      {
        where: { VendorID: vendorId },
        transaction: t,
      }
    );

<<<<<<< HEAD
    // 2. Update GST numbers in place
    const incomingGst = vendorData.gstNumbers || vendorData.gstDetails;

    if (incomingGst && Array.isArray(incomingGst)) {
      const existingGstRows = await VendorGST.findAll({
=======
    // 2. GST Numbers Handle Karo (Old badha delete karo ane navi list insert karo)
    const incomingGst = vendorData.gstNumbers || vendorData.gstDetails;

    if (incomingGst && Array.isArray(incomingGst)) {
      // Pehla aa vendor na juna badha GST records destroy kari do
      await VendorGST.destroy({
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        where: { VendorID: vendorId },
        transaction: t,
      });

<<<<<<< HEAD
      const cleanIncoming = incomingGst
=======
      // Pachi navi valid entries filter kari ne create karo
      const gstRecordsToCreate = incomingGst
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        .filter((item) => {
          const gstVal = typeof item === "string" ? item : item.GSTNumber;
          return gstVal && typeof gstVal === "string" && gstVal.trim() !== "";
        })
<<<<<<< HEAD
        .map((item, index) => ({
          VendorGSTID: typeof item === "object" ? item.VendorGSTID || null : null,
          GSTNumber: (typeof item === "string" ? item : item.GSTNumber).trim(),
          StateName:
            typeof item === "object" && item.StateName
              ? item.StateName
              : getStateFromGST(typeof item === "string" ? item : item.GSTNumber),
          IsDefault:
            typeof item === "object" && item.IsDefault !== undefined
              ? Boolean(item.IsDefault)
              : index === 0,
        }));

      const incomingIds = new Set(
        cleanIncoming.filter((r) => r.VendorGSTID).map((r) => r.VendorGSTID)
      );

      const idsToDelete = existingGstRows
        .map((row) => row.VendorGSTID)
        .filter((id) => !incomingIds.has(id));

      if (idsToDelete.length > 0) {
        await VendorGST.destroy({
          where: { VendorGSTID: idsToDelete },
          transaction: t,
        });
      }

      const rowsToCreate = [];
      for (const row of cleanIncoming) {
        if (row.VendorGSTID) {
          await VendorGST.update(
            {
              GSTNumber: row.GSTNumber,
              StateName: row.StateName,
              IsDefault: row.IsDefault,
            },
            { where: { VendorGSTID: row.VendorGSTID }, transaction: t }
          );
        } else {
          rowsToCreate.push({
            VendorID: vendorId,
            GSTNumber: row.GSTNumber,
            StateName: row.StateName,
            IsDefault: row.IsDefault,
          });
        }
      }

      if (rowsToCreate.length > 0) {
        await VendorGST.bulkCreate(rowsToCreate, { transaction: t });
=======
        .map((item, index) => {
          const cleanGST = typeof item === "string" ? item.trim() : item.GSTNumber.trim();
          const derivedState = getStateFromGST(cleanGST);

          return {
            VendorID: vendorId,
            GSTNumber: cleanGST,
            StateName: typeof item === "object" && item.StateName ? item.StateName : derivedState,
            IsDefault: typeof item === "object" && item.IsDefault !== undefined ? Boolean(item.IsDefault) : index === 0,
          };
        });

      if (gstRecordsToCreate.length > 0) {
        await VendorGST.bulkCreate(gstRecordsToCreate, { transaction: t });
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      }
    }

    if (!isExternalTransaction) {
      await t.commit();
    }

<<<<<<< HEAD
=======
    // Updated vendor data with related GST records return karo
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    return await getVendorById(vendorId);
  } catch (error) {
    if (!isExternalTransaction) {
      await t.rollback();
    }
    throw error;
  }
};

const deleteVendorGST = async (vendorId, transaction = null) => {
  return VendorGST.destroy({
    where: { VendorID: vendorId },
    transaction,
  });
};

const deleteVendor = async (vendorId, transaction = null) => {
  return Vendor.destroy({
    where: { VendorID: vendorId },
    transaction,
  });
};

/**
 * Bulk upload vendors with multi-GST support, automatic state deduction, and default mapping.
 */
const bulkUploadVendors = async (rawData) => {
  const transaction = await sequelize.transaction();
  try {
    let successCount = 0;
    let errors = [];

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index];
      try {
<<<<<<< HEAD
        if (!row.VendorName) {
          throw new Error(`Row ${index + 1}: VendorName is required.`);
        }

        let vendorCode = row.VendorCode ? String(row.VendorCode).trim() : `VEN-${Math.floor(1000 + Math.random() * 9000)}`;

        const existingVendor = await Vendor.findOne({ where: { VendorCode: vendorCode }, transaction });
        if (existingVendor) {
          throw new Error(`Row ${index + 1}: VendorCode '${vendorCode}' already exists.`);
        }

        const newVendor = await Vendor.create({
          VendorCode: vendorCode,
=======
        if (!row.VendorCode || !row.VendorName) {
          throw new Error(`Row ${index + 1}: VendorCode and VendorName are required.`);
        }

        const existingVendor = await Vendor.findOne({ where: { VendorCode: row.VendorCode }, transaction });
        if (existingVendor) {
          throw new Error(`Row ${index + 1}: VendorCode '${row.VendorCode}' already exists.`);
        }

        const newVendor = await Vendor.create({
          VendorCode: row.VendorCode,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          VendorName: row.VendorName,
          Address: row.Address || null,
          ContactPerson: row.ContactPerson || null,
          Email: row.Email || null,
          MobileNo: row.MobileNo ? String(row.MobileNo) : null,
          PANNo: row.PANNo || null,
          IsActive: row.IsActive !== undefined ? Boolean(row.IsActive) : true,
        }, { transaction });

        const gstFields = [row.GSTNumber1, row.GSTNumber2, row.GSTNumber3, row.GSTNumber4];
        let gstIndex = 0;

        for (const gstVal of gstFields) {
          if (gstVal && typeof gstVal === "string" && gstVal.trim() !== "") {
            const cleanGST = gstVal.trim();
            const derivedState = getStateFromGST(cleanGST);

            await VendorGST.create({
              VendorID: newVendor.VendorID,
              GSTNumber: cleanGST,
              StateName: derivedState,
<<<<<<< HEAD
              IsDefault: gstIndex === 0 ? true : false,
=======
              IsDefault: gstIndex === 0 ? true : false, // First GST number is default true
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            }, { transaction });

            gstIndex++;
          }
        }

        successCount++;
      } catch (rowError) {
        errors.push({ row: index + 1, message: rowError.message });
      }
    }

    if (errors.length > 0 && successCount === 0) {
<<<<<<< HEAD
=======
      await transaction.rollback();
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      throw new Error(`Bulk upload failed: ${errors.map(e => e.message).join(" | ")}`);
    }

    await transaction.commit();
    return { successCount, errors };
  } catch (error) {
<<<<<<< HEAD
    if (!transaction.finished) {
      await transaction.rollback();
    }
=======
    await transaction.rollback();
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    throw error;
  }
};

module.exports = {
  createVendor,
  createVendorGST,
  findVendorByPAN,
  findVendorByCode,
  findGST,
  getVendorById,
  getAllVendors,
  updateVendor,
  deleteVendorGST,
  deleteVendor,
  bulkUploadVendors,
};