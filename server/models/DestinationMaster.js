const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DestinationMaster = sequelize.define(
  "DestinationMaster",
  {
    DestinationID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    City: {
      type: DataTypes.STRING(200),
    },
    District: {
      type: DataTypes.STRING(200),
    },
    State: {
      type: DataTypes.STRING(200),
      defaultValue: "Gujarat",
    },
    Pincode: {
      type: DataTypes.STRING(10),
    },
  },
  {
    tableName: "DestinationMaster",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["City", "State", "Pincode"],
      },
    ],
  }
);

module.exports = DestinationMaster;