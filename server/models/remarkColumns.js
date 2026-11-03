const { DataTypes } = require("sequelize");
const { REMARK_MAX_LENGTH } = require("../constants/remarks");

// Shared column definitions for the "Remark by User" / system remark pair
// (see constants/remarks.js). Spread into a model's attributes.
const USER_REMARKS_COLUMN = {
  UserRemarks: {
    type: DataTypes.STRING(REMARK_MAX_LENGTH),
    allowNull: true,
  },
};

const REMARK_COLUMNS = {
  ...USER_REMARKS_COLUMN,
  Remarks: {
    type: DataTypes.STRING(REMARK_MAX_LENGTH),
    allowNull: true,
  },
};

module.exports = { USER_REMARKS_COLUMN, REMARK_COLUMNS };
