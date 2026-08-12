const { QueryTypes } = require('sequelize');
const sequelize = require("../config/database");

const getSettingMetadata = async () => {
    const companies = await sequelize.query("SELECT * FROM Companies WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const sbus = await sequelize.query("SELECT * FROM SBUs WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const plants = await sequelize.query("SELECT * FROM PlantsHierarchy WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const locations = await sequelize.query("SELECT * FROM PlantLocations WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const users = await sequelize.query("SELECT UserID, FullName, Email FROM Users WHERE IsActive = 1", { type: QueryTypes.SELECT });
    
    // Join with Users table and PlantLocations for approval configurations
    const approvalConfigs = await sequelize.query(`
        SELECT ac.*, 
               u1.FullName AS PrimaryUserName, 
               u2.FullName AS OptionalUserName 
        FROM ApprovalConfig ac
        LEFT JOIN Users u1 ON ac.PrimaryUserID = u1.UserID
        LEFT JOIN Users u2 ON ac.OptionalUserID = u2.UserID
    `, { type: QueryTypes.SELECT });

    return { companies, sbus, plants, locations, users, approvalConfigs };
};

const saveApprovalConfig = async (data) => {
    const { 
        locationID, 
        primaryUserID, 
        primaryEmail, 
        optionalUserID, 
        optionalEmail, 
        isPrimaryActive, 
        isOptionalActive 
    } = data;

    // 1. Location ID parthi PlantHierarchyID, SBUID, ane CompanyID automatic track karo
    const locationInfo = await sequelize.query(`
        SELECT l.LocationID, l.PlantHierarchyID, p.SBUID, s.CompanyID 
        FROM PlantLocations l
        JOIN PlantsHierarchy p ON l.PlantHierarchyID = p.PlantHierarchyID
        JOIN SBUs s ON p.SBUID = s.SBUID
        WHERE l.LocationID = :locationID
    `, { 
        replacements: { locationID }, 
        type: QueryTypes.SELECT 
    });

    const companyID = locationInfo.length > 0 ? locationInfo[0].CompanyID : null;
    const sbuID = locationInfo.length > 0 ? locationInfo[0].SBUID : null;
    const plantHierarchyID = locationInfo.length > 0 ? locationInfo[0].PlantHierarchyID : null;

    // 2. Check if configuration already exists for this LocationID
    const existing = await sequelize.query(
        "SELECT * FROM ApprovalConfig WHERE LocationID = :locationID",
        { replacements: { locationID }, type: QueryTypes.SELECT }
    );

    if (existing.length > 0) {
        const updateQuery = `
            UPDATE ApprovalConfig 
            SET CompanyID = :companyID,
                SBUID = :sbuID,
                PlantHierarchyID = :plantHierarchyID,
                PrimaryUserID = :primaryUserID, 
                PrimaryEmail = :primaryEmail, 
                OptionalUserID = :optionalUserID, 
                OptionalEmail = :optionalEmail, 
                IsPrimaryActive = :isPrimaryActive, 
                IsOptionalActive = :isOptionalActive
            WHERE LocationID = :locationID
        `;
        await sequelize.query(updateQuery, {
            replacements: { 
                companyID: companyID || null,
                sbuID: sbuID || null,
                plantHierarchyID: plantHierarchyID || null,
                locationID, 
                primaryUserID: primaryUserID || null, 
                primaryEmail: primaryEmail || null, 
                optionalUserID: optionalUserID || null, 
                optionalEmail: optionalEmail || null, 
                isPrimaryActive: isPrimaryActive ? 1 : 0, 
                isOptionalActive: isOptionalActive ? 1 : 0 
            },
            type: QueryTypes.UPDATE
        });
    } else {
        const insertQuery = `
            INSERT INTO ApprovalConfig (CompanyID, SBUID, PlantHierarchyID, LocationID, PrimaryUserID, PrimaryEmail, OptionalUserID, OptionalEmail, IsPrimaryActive, IsOptionalActive)
            VALUES (:companyID, :sbuID, :plantHierarchyID, :locationID, :primaryUserID, :primaryEmail, :optionalUserID, :optionalEmail, :isPrimaryActive, :isOptionalActive)
        `;
        await sequelize.query(insertQuery, {
            replacements: { 
                companyID: companyID || null,
                sbuID: sbuID || null,
                plantHierarchyID: plantHierarchyID || null,
                locationID, 
                primaryUserID: primaryUserID || null, 
                primaryEmail: primaryEmail || null, 
                optionalUserID: optionalUserID || null, 
                optionalEmail: optionalEmail || null, 
                isPrimaryActive: isPrimaryActive ? 1 : 0, 
                isOptionalActive: isOptionalActive ? 1 : 0 
            },
            type: QueryTypes.INSERT
        });
    }

    return true;
};

const addMasterItem = async (data) => {
    const { type, name, parentID, mode, id } = data;
    let query = "";
    let replacements = {};

    if (mode === 'edit') {
        if (type === 'company') {
            query = "UPDATE Companies SET CompanyName = :name WHERE CompanyID = :id";
            replacements = { name, id };
        } else if (type === 'sbu') {
            query = "UPDATE SBUs SET SBUName = :name WHERE SBUID = :id";
            replacements = { name, id };
        } else if (type === 'plant') {
            query = "UPDATE PlantsHierarchy SET PlantName = :name WHERE PlantHierarchyID = :id";
            replacements = { name, id };
        } else if (type === 'location') {
            query = "UPDATE PlantLocations SET LocationName = :name WHERE LocationID = :id";
            replacements = { name, id };
        }
    } else {
        if (type === 'company') {
            query = "INSERT INTO Companies (CompanyName) VALUES (:name)";
            replacements = { name };
        } else if (type === 'sbu') {
            query = "INSERT INTO SBUs (CompanyID, SBUName) VALUES (:parentID, :name)";
            replacements = { parentID, name };
        } else if (type === 'plant') {
            query = "INSERT INTO PlantsHierarchy (SBUID, PlantName) VALUES (:parentID, :name)";
            replacements = { parentID, name };
        } else if (type === 'location') {
            // Location ma fatak LocationName ane parent (PlantHierarchyID) j aavse
            query = "INSERT INTO PlantLocations (PlantHierarchyID, LocationName) VALUES (:parentID, :name)";
            replacements = { parentID, name };
        } else {
            const error = new Error("Invalid type specified.");
            error.statusCode = 400;
            throw error;
        }
    }

    await sequelize.query(query, {
        replacements,
        type: mode === 'edit' ? QueryTypes.UPDATE : QueryTypes.INSERT
    });

    return { type: type.toUpperCase(), action: mode === 'edit' ? 'updated' : 'added' };
};

module.exports = {
    getSettingMetadata,
    saveApprovalConfig,
    addMasterItem,
};