const createModuleRouter = require("./moduleRouteFactory");
const {
  Plant,
  PlantLocation,
  VehicleType,
  WeightMaster,
  DestinationMaster,
  StatusMaster,
  CustomerMaster,
} = require("../models");

const registry = {
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
    primaryKey: "VehicleTypeID",
    searchFields: ["VehicleName", "Unit"],
    sortFields: ["VehicleTypeID", "VehicleName", "Capacity", "Unit"],
    // Soft-delete: DELETE on this module flips IsActive to false instead of
    // removing the row, since vehicle types are referenced by historical
    // contracts/invoices (task item 4/7: "activate/deactivate, not delete").
    softDeleteField: "IsActive",
    bulkUploadFields: ["VehicleName", "Capacity", "Unit"],
  },
  weights: {
    model: WeightMaster,
    tableName: "WeightMaster",
    primaryKey: "WeightID",
    searchFields: ["WeightUnit"],
    sortFields: ["WeightID", "Weight", "WeightUnit"],
    softDeleteField: "IsActive",
    bulkUploadFields: ["Weight", "WeightUnit"],
  },
  destinations: {
    model: DestinationMaster,
    tableName: "DestinationMaster",
    primaryKey: "DestinationID",
    searchFields: ["City", "District", "State"],
    sortFields: ["DestinationID", "City", "District", "State"],
    softDeleteField: "IsActive",
    // Only City is submitted (task item 7) - District/State are
    // auto-filled server-side by DestinationMaster's beforeValidate hook.
    bulkUploadFields: ["City"],
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
    primaryKey: "CustomerID",
    searchFields: ["CustomerName", "ContactPerson", "Email", "Phone"],
    sortFields: ["CustomerID", "CustomerName", "IsActive"],
    softDeleteField: "IsActive",
    bulkUploadFields: ["CustomerName", "ContactPerson", "Email", "Phone", "Address"],
  },
};

module.exports = createModuleRouter(registry);
