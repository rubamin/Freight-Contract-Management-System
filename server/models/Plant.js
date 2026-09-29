const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Plant = sequelize.define(
  "Plant",
  {
    PlantID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    PlantCode: {
      type: DataTypes.STRING(20),
      unique: true,
    },
    PlantName: {
      type: DataTypes.STRING(200),
    },
    City: {
      type: DataTypes.STRING(100),
    },
    State: {
      type: DataTypes.STRING(100),
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Links a Plant to a Location under the Company -> SBU -> PlantsHierarchy
    // -> PlantLocations hierarchy, so the plants API can surface the real
    // LocationName instead of Plants having no relationship to that
    // hierarchy at all. Nullable since existing Plants rows predate this
    // column (see migration_v5.sql).
    LocationID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "Plants",
    timestamps: false,
  }
);

module.exports = Plant;
