const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
<<<<<<< HEAD
const { literal } = require("sequelize");
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

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
<<<<<<< HEAD
      defaultValue: literal("GETDATE()"),
=======
      defaultValue: DataTypes.NOW,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    },
  },
  {
    tableName: "Roles",
    timestamps: false,
  }
);

module.exports = Role;
