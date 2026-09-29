const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { lookupDistrictForCity, DEFAULT_STATE } = require("../constants/gujaratCityLookup");

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
      allowNull: false,
    },
    // Auto-filled from City via the lookup below (task item 7) - no longer
    // a field the user types directly.
    District: {
      type: DataTypes.STRING(200),
    },
    State: {
      type: DataTypes.STRING(200),
      defaultValue: DEFAULT_STATE,
    },
    // Pincode removed entirely (task item 7) - see migration_v3.sql step 2.
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "DestinationMaster",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["City", "State"],
      },
    ],
    hooks: {
      // Auto-fills District/State from City on every create/update (task
      // item 7), so this happens no matter which entry point is used -
      // the Add/Edit form, bulk Excel upload, or the inline "add new
      // destination" flow in Edit Contract - instead of each one needing
      // its own copy of the lookup logic.
      beforeValidate: (destination) => {
        if (destination.City) {
          const matchedDistrict = lookupDistrictForCity(destination.City);
          if (matchedDistrict) {
            destination.District = matchedDistrict;
          }
          if (!destination.State) {
            destination.State = DEFAULT_STATE;
          }
        }
      },
    },
  }
);

module.exports = DestinationMaster;