const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WeightMaster = sequelize.define(
  "WeightMaster",
  {
    WeightID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Simplified from a FromWeight/ToWeight range to a single value (task
    // item 9) - see migration_v3.sql step 3 for the data migration
    // (existing FromWeight values are carried over into this column).
    Weight: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    WeightUnit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "MT",
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "WeightMaster",
    timestamps: false,
  }
);

module.exports = WeightMaster;
