const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const Role = sequelize.define(
  "Role",
  {
    RoleID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    RoleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    Description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,

    },
  },
  {
    tableName: "Roles",
    timestamps: false,
  }
);

module.exports = Role;
