const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
<<<<<<< HEAD
const { literal } = require("sequelize");
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

const User = sequelize.define(
  "User",
  {
    UserID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    RoleID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    FullName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    Email: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Invalid email address",
        },
      },
    },

    PasswordHash: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    MobileNo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

<<<<<<< HEAD
    ProfilePhotoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    LastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    CreatedAt: {
      type: DataTypes.DATE,
<<<<<<< HEAD
      defaultValue: literal("GETDATE()"),
    },

    PasswordResetTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    PasswordResetExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
=======
      defaultValue: DataTypes.NOW,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    },
  },
  {
    tableName: "Users",
    timestamps: false,
  }
);

<<<<<<< HEAD
module.exports = User;
=======
module.exports = User;
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
