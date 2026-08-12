const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const InvoiceVerification = sequelize.define(
  "InvoiceVerification",
  {
    VerificationID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    InvoiceID: DataTypes.BIGINT,
    ContractID: DataTypes.INTEGER,
    ExpectedAmount: DataTypes.DECIMAL(18, 2),
    InvoiceAmount: DataTypes.DECIMAL(18, 2),
    DifferenceAmount: DataTypes.DECIMAL(18, 2),
    VerificationStatus: DataTypes.STRING(50),
    VerifiedBy: DataTypes.INTEGER,
    VerifiedDate: DataTypes.DATE,
  },
  {
    tableName: "InvoiceVerification",
    timestamps: false,
  }
);

// FIXED: Attached baseline association mapping to complete the relationship
InvoiceVerification.associate = (models) => {
  InvoiceVerification.belongsTo(models.InvoiceHeader, {
    foreignKey: "InvoiceID",
    as: "invoice",
  });
};

module.exports = InvoiceVerification;