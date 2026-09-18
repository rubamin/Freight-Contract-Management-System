const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { lookupDistrictForCity } = require("../constants/indiaCityDistrictLookup");

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
    // No blanket default (task item: nationwide lookup) - a single
    // "Gujarat" default doesn't hold once destinations can be anywhere in
    // India. Left blank unless the City lookup resolves it below or the
    // caller supplies it explicitly.
    State: {
      type: DataTypes.STRING(200),
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
      // item 7, now nationwide), so this happens no matter which entry
      // point is used - the Add/Edit form, bulk Excel upload, or the
      // inline "add new destination" flow in Edit Contract - instead of
      // each one needing its own copy of the lookup logic.
      //
      // Only auto-fills when the City resolves to EXACTLY ONE district/
      // state. When it resolves to zero, there's nothing to fill. When it
      // resolves to more than one (e.g. "Aurangabad" - Maharashtra or
      // Bihar), this hook deliberately does NOT guess - the frontend form
      // is responsible for making the user pick one before the record
      // ever reaches here, and any District/State the caller already
      // supplied (e.g. after that pick) is left untouched.
      beforeValidate: (destination) => {
        if (destination.City) {
          const matches = lookupDistrictForCity(destination.City);
          if (matches.length === 1) {
            if (!destination.District) destination.District = matches[0].district;
            if (!destination.State) destination.State = matches[0].state;
          }
        }
      },
    },
  }
);

module.exports = DestinationMaster;