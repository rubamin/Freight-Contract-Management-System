const { QueryTypes } = require('sequelize');
const sequelize = require("../config/database");
const approvalWorkflowService = require("./approvalWorkflow.service");
const { LOCATION_ACTIONS, getLocationIdsWithAction } = require("../utils/locationAccess");

const sameId = (a, b) => Number(a) === Number(b);

// Keeps only the locations the user has the action on, and the Company /
// SBU / Plant levels above them (Add / Edit Invoice location pickers).
const limitHierarchyToAccess = async (hierarchy, user, access) => {
    if (!Object.values(LOCATION_ACTIONS).includes(access)) return hierarchy;
    const allowedIds = await getLocationIdsWithAction(user, access);
    if (!allowedIds) return hierarchy;

    const locations = hierarchy.locations.filter((location) => allowedIds.some((id) => sameId(id, location.LocationID)));
    const plants = hierarchy.plants.filter((plant) => locations.some((location) => sameId(location.PlantHierarchyID, plant.PlantHierarchyID)));
    const sbus = hierarchy.sbus.filter((sbu) => plants.some((plant) => sameId(plant.SBUID, sbu.SBUID)));
    const companies = hierarchy.companies.filter((company) => sbus.some((sbu) => sameId(sbu.CompanyID, company.CompanyID)));
    return { ...hierarchy, companies, sbus, plants, locations };
};

// access (optional): view | add | edit - limit the hierarchy to the
// locations the user has that action on. Admins always get everything.
const getSettingMetadata = async ({ user, access } = {}) => {
    const companies = await sequelize.query("SELECT * FROM Companies WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const sbus = await sequelize.query("SELECT * FROM SBUs WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const plants = await sequelize.query("SELECT * FROM PlantsHierarchy WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const locations = await sequelize.query("SELECT * FROM PlantLocations WHERE IsActive = 1", { type: QueryTypes.SELECT });
    const users = await sequelize.query(`
        SELECT u.UserID, u.FullName, u.Email, r.RoleName
        FROM Users u
        LEFT JOIN Roles r ON r.RoleID = u.RoleID
        WHERE u.IsActive = 1
        ORDER BY u.FullName
    `, { type: QueryTypes.SELECT });
    const workflows = await approvalWorkflowService.getAllWorkflows();

    return limitHierarchyToAccess({ companies, sbus, plants, locations, users, workflows }, user, access);
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
    addMasterItem,
};