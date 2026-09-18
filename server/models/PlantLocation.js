const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Location under the Company -> SBU -> PlantsHierarchy -> PlantLocations
// hierarchy (managed from Settings & Hierarchy). Previously only queried
// with raw SQL in setting.service.js; this model exists so other tables
// (e.g. Plants) can declare a real association to it instead of the two
// systems having no relational link at all.
const PlantLocation = sequelize.define(
  "PlantLocation",
  {
    LocationID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    PlantHierarchyID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    LocationName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "PlantLocations",
    timestamps: false,
  }
);

module.exports = PlantLocation;
