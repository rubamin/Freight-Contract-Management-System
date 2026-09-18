const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Vendor = sequelize.define(
  "Vendor",
  {
    VendorID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    VendorCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },

    VendorName: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },

    Address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    ContactPerson: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    Email: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        isEmail: {
          msg: "Invalid email address",
        },
      },
    },

    MobileNo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    PANNo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    // CreatedAt: {
    //   type: DataTypes.DATE,
    //   defaultValue: DataTypes.NOW,
    // },
  },
  {
    tableName: "Vendors",
    timestamps: false,
  }
);

module.exports = Vendor;