const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

const InvoiceHeader = sequelize.define(
  "InvoiceHeader",
  {
    InvoiceID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    InvoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    CustomerName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    InvoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    VendorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    VendorGSTID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    PlantID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Real FK to PlantLocations - the Location the user actually selects on
    // the Add Invoice page's Step 1 hierarchy (Company -> SBU -> Plant ->
    // Location). Previously there was no column for this at all, so only
    // PlantID (a different, unrelated master table) was ever stored, and
    // LocationName below had no reliable source to be derived from.
    LocationID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    LocationName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    IsPreApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ContractID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    LRNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    LRDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    VehicleTypeID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    TotalWeight: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    DistanceKM: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    BasicFreight: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    OtherCharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    DetainCharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    ExtraCharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00,
    },
    GSTAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    TotalInvoiceAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    InvoiceStatusID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    UploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    UploadedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
    FromStation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    ToStation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    Remarks: {
      type: DataTypes.STRING(DataTypes.MAX),
      allowNull: true,
    },
    // --- Newly added document path fields ---
    Doc1Path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    Doc2Path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    Doc3Path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "InvoiceHeader",
    timestamps: false,
  }
);

InvoiceHeader.associate = (models) => {
  InvoiceHeader.hasOne(models.InvoiceVerification, {
    foreignKey: "InvoiceID",
    as: "verification",
  });
};

module.exports = InvoiceHeader;