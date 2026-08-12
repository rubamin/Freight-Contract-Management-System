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
  },
  {
    tableName: "Plants",
    timestamps: false,
  }
);

module.exports = Plant;
