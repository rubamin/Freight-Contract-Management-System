const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const StatusMaster = sequelize.define(
  "StatusMaster",
  {
    StatusID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    StatusName: {
      type: DataTypes.STRING(100),
    },
    ModuleName: {
      type: DataTypes.STRING(100),
    },
  },
  {
    tableName: "StatusMaster",
    timestamps: false,
  }
);

module.exports = StatusMaster;
