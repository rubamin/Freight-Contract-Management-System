const createModuleRouter = require("./moduleRouteFactory");
const {
  Plant,
<<<<<<< HEAD
  PlantLocation,
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  VehicleType,
  WeightMaster,
  DestinationMaster,
  StatusMaster,
<<<<<<< HEAD
  CustomerMaster,
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
} = require("../models");

const registry = {
  plants: {
    model: Plant,
    tableName: "Plants",
    primaryKey: "PlantID",
    searchFields: ["PlantCode", "PlantName", "City", "State"],
    sortFields: ["PlantID", "PlantCode", "PlantName", "City", "State", "IsActive"],
<<<<<<< HEAD
    // Surfaces the real LocationName from PlantLocations on every plant
    // record instead of the two tables having no relationship at all.
    include: [{ model: PlantLocation, as: "location", attributes: ["LocationID", "LocationName"] }],
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  },
  "vehicle-types": {
    model: VehicleType,
    tableName: "VehicleTypes",
    primaryKey: "VehicleTypeID",
    searchFields: ["VehicleName", "Unit"],
    sortFields: ["VehicleTypeID", "VehicleName", "Capacity", "Unit"],
<<<<<<< HEAD
    // Soft-delete: DELETE on this module flips IsActive to false instead of
    // removing the row, since vehicle types are referenced by historical
    // contracts/invoices (task item 4/7: "activate/deactivate, not delete").
    softDeleteField: "IsActive",
    bulkUploadFields: ["VehicleName", "Capacity", "Unit"],
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  },
  weights: {
    model: WeightMaster,
    tableName: "WeightMaster",
    primaryKey: "WeightID",
    searchFields: ["WeightUnit"],
<<<<<<< HEAD
    sortFields: ["WeightID", "Weight", "WeightUnit"],
    softDeleteField: "IsActive",
    bulkUploadFields: ["Weight", "WeightUnit"],
=======
    sortFields: ["WeightID", "FromWeight", "ToWeight", "WeightUnit"],
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  },
  destinations: {
    model: DestinationMaster,
    tableName: "DestinationMaster",
    primaryKey: "DestinationID",
<<<<<<< HEAD
    searchFields: ["City", "District", "State"],
    sortFields: ["DestinationID", "City", "District", "State"],
    softDeleteField: "IsActive",
    // Only City is submitted (task item 7) - District/State are
    // auto-filled server-side by DestinationMaster's beforeValidate hook.
    bulkUploadFields: ["City"],
=======
    searchFields: ["City", "District", "State", "Pincode"],
    sortFields: ["DestinationID", "City", "District", "State", "Pincode"],
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  },
  statuses: {
    model: StatusMaster,
    tableName: "StatusMaster",
    primaryKey: "StatusID",
    searchFields: ["StatusName", "ModuleName"],
    sortFields: ["StatusID", "StatusName", "ModuleName"],
  },
<<<<<<< HEAD
  customers: {
    model: CustomerMaster,
    tableName: "CustomerMaster",
    primaryKey: "CustomerID",
    searchFields: ["CustomerName", "ContactPerson", "Email", "Phone"],
    sortFields: ["CustomerID", "CustomerName", "IsActive"],
    softDeleteField: "IsActive",
    bulkUploadFields: ["CustomerName", "ContactPerson", "Email", "Phone", "Address"],
  },
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
};

module.exports = createModuleRouter(registry);
