const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");
const { USER_REMARKS_COLUMN } = require("./remarkColumns");

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
    // Contract type the invoice was entered under (migration_v11).
    ContractType: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    LRNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Sales Order number of the trip (migration_v15).
    SONumber: {
      type: DataTypes.STRING(50),
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
    // Per contract type fields entered on Add Invoice (migration_v11).
    Packages: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ChargedWeight: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    BilledRate: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: true,
    },
    DocketCharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    ODACategory: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    ODACharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    FOVCharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    LoadingCharges: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
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
    // System generated audit outcome - see constants/remarks.js.
    Remarks: {
      type: DataTypes.STRING(DataTypes.MAX),
      allowNull: true,
    },
    ...USER_REMARKS_COLUMN,
    // Approval workflow tracking (migration_v14) - see
    // services/approvalWorkflow.service.js.
    ApprovalStatus: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    CurrentStepOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    SelectedApproverUserID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DraftCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    SubmittedForApprovalAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    FinalApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    FinalApprovedBy: {
      type: DataTypes.INTEGER,
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