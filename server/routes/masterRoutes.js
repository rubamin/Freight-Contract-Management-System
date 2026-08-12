const createModuleRouter = require("./moduleRouteFactory");
const {
  Plant,
  VehicleType,
  WeightMaster,
  DestinationMaster,
  StatusMaster,
} = require("../models");

const registry = {
  plants: {
    model: Plant,
    tableName: "Plants",
    primaryKey: "PlantID",
    searchFields: ["PlantCode", "PlantName", "City", "State"],
    sortFields: ["PlantID", "PlantCode", "PlantName", "City", "State", "IsActive"],
  },
  "vehicle-types": {
    model: VehicleType,
    tableName: "VehicleTypes",
    primaryKey: "VehicleTypeID",
    searchFields: ["VehicleName", "Unit"],
    sortFields: ["VehicleTypeID", "VehicleName", "Capacity", "Unit"],
  },
  weights: {
    model: WeightMaster,
    tableName: "WeightMaster",
    primaryKey: "WeightID",
    searchFields: ["WeightUnit"],
    sortFields: ["WeightID", "FromWeight", "ToWeight", "WeightUnit"],
  },
  destinations: {
    model: DestinationMaster,
    tableName: "DestinationMaster",
    primaryKey: "DestinationID",
    searchFields: ["City", "District", "State", "Pincode"],
    sortFields: ["DestinationID", "City", "District", "State", "Pincode"],
  },
  statuses: {
    model: StatusMaster,
    tableName: "StatusMaster",
    primaryKey: "StatusID",
    searchFields: ["StatusName", "ModuleName"],
    sortFields: ["StatusID", "StatusName", "ModuleName"],
  },
};

module.exports = createModuleRouter(registry);
