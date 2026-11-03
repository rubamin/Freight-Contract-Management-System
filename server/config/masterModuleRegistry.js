const {
  Plant,
  PlantLocation,
  VehicleType,
  WeightMaster,
  DestinationMaster,
  StatusMaster,
  CustomerMaster,
} = require("../models");

// Generic CRUD masters served under /api/masters. Shared by the master
// routes and the master approval workflow, which applies an approved Add /
// Edit through the same crud.service calls the routes use.
const masterModuleRegistry = {
  plants: {
    model: Plant,
    tableName: "Plants",
    primaryKey: "PlantID",
    searchFields: ["PlantCode", "PlantName", "City", "State"],
    sortFields: ["PlantID", "PlantCode", "PlantName", "City", "State", "IsActive"],
    // Surfaces the real LocationName from PlantLocations on every plant
    // record instead of the two tables having no relationship at all.
    include: [{ model: PlantLocation, as: "location", attributes: ["LocationID", "LocationName"] }],
  },
  "vehicle-types": {
    model: VehicleType,
    tableName: "VehicleTypes",
    allowHardDelete: true,
    primaryKey: "VehicleTypeID",
    searchFields: ["VehicleName", "Unit"],
    sortFields: ["VehicleTypeID", "VehicleName", "Capacity", "Unit"],
    // Soft-delete: DELETE on this module flips IsActive to false instead of
    // removing the row, since vehicle types are referenced by historical
    // contracts/invoices (task item 4/7: "activate/deactivate, not delete").
    softDeleteField: "IsActive",
    systemRemarks: true,
    bulkUploadFields: ["VehicleName", "Capacity", "Unit", "UserRemarks"],
  },
  weights: {
    model: WeightMaster,
    tableName: "WeightMaster",
    allowHardDelete: true,
    primaryKey: "WeightID",
    searchFields: ["WeightUnit"],
    sortFields: ["WeightID", "Weight", "WeightUnit"],
    softDeleteField: "IsActive",
    systemRemarks: true,
    bulkUploadFields: ["Weight", "WeightUnit", "UserRemarks"],
  },
  destinations: {
    model: DestinationMaster,
    tableName: "DestinationMaster",
    allowHardDelete: true,
    primaryKey: "DestinationID",
    searchFields: ["City", "District", "State"],
    sortFields: ["DestinationID", "City", "District", "State"],
    softDeleteField: "IsActive",
    systemRemarks: true,
    // Only City is submitted (task item 7) - District/State are
    // auto-filled server-side by DestinationMaster's beforeValidate hook.
    bulkUploadFields: ["City", "UserRemarks"],
  },
  statuses: {
    model: StatusMaster,
    tableName: "StatusMaster",
    primaryKey: "StatusID",
    searchFields: ["StatusName", "ModuleName"],
    sortFields: ["StatusID", "StatusName", "ModuleName"],
  },
  customers: {
    model: CustomerMaster,
    tableName: "CustomerMaster",
    allowHardDelete: true,
    primaryKey: "CustomerID",
    searchFields: ["CustomerName", "PartyType", "ContactPerson", "Email", "Phone"],
    sortFields: ["CustomerID", "CustomerName", "PartyType", "IsActive"],
    softDeleteField: "IsActive",
    systemRemarks: true,
    // PartyType accepts Customer / Supplier in any case (see the model hook).
    bulkUploadFields: ["CustomerName", "PartyType", "ContactPerson", "Email", "Phone", "Address", "UserRemarks"],
  },
};

module.exports = masterModuleRegistry;
