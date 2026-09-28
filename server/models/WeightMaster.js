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
    FromWeight: {
      type: DataTypes.DECIMAL(18, 2),
    },
    ToWeight: {
      type: DataTypes.DECIMAL(18, 2),
    },
    WeightUnit: {
      type: DataTypes.STRING(20),

    },
  },
  {
    tableName: "WeightMaster",
    timestamps: false,
  }
);

module.exports = WeightMaster;
