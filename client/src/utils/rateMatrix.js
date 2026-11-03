// Shared helpers for splitting a contract's rate matrix into the two
// template sheets and labelling Sheet 1 weight-slab columns.

// Template download paths per contract type live in
// constants/contractTypes.js (getContractTemplate).

const hasValue = (value) => value !== null && value !== undefined && value !== "";

const getWeightId = (row) => (row.WeightID !== undefined ? row.WeightID : row.weightID);
const getVehicleTypeId = (row) => (row.VehicleTypeID !== undefined ? row.VehicleTypeID : row.vehicleTypeID);

// Sheet 1 rows are keyed by a weight slab (and, since the template import,
// also carry the slab's Vehicle Type). Sheet 2 rows carry a Vehicle Type only.
export const isDomesticRateRow = (row) => hasValue(getWeightId(row)) || !hasValue(getVehicleTypeId(row));

export const isAdditionalRateRow = (row) => !hasValue(getWeightId(row)) && hasValue(getVehicleTypeId(row));

// Column label of a Sheet 1 row, e.g. "20-21 MT".
export const getSlabLabel = (row) => {
  if (row.slabLabel) return row.slabLabel;

  const vehicle = row.vehicleType || row.VehicleType;
  if (vehicle?.VehicleName) return vehicle.VehicleName;

  const weight = row.weight || row.Weight;
  if (weight && (weight.Weight !== undefined || weight.weight !== undefined)) {
    return `${Number(weight.Weight !== undefined ? weight.Weight : weight.weight)} ${weight.WeightUnit || "MT"}`;
  }
  return row.WeightID ? `Weight ID ${row.WeightID}` : "Standard Rate";
};
