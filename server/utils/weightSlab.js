const { DEFAULT_WEIGHT_UNIT } = require("../constants/rateMatrixTemplate");

// Matches a pure weight-slab label: "10 MT", "7.5 MT", "20-21 MT", "20 TO 21 MT".
const SLAB_LABEL_PATTERN = /^(\d+(?:\.\d+)?)(?:\s*(?:-|TO)\s*(\d+(?:\.\d+)?))?\s*MT$/;
const TONNAGE_PATTERN = /(\d+(?:\.\d+)?)\s*MT/gi;

const stripBracketedText = (value) => String(value ?? "").replace(/\(.*?\)/g, " ");

const collapseWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

// Parses a Sheet 1 column header (e.g. "20-21 MT (Revised)") or a vehicle
// type name into { label, capacity }. Returns null when the text is not a
// plain weight slab. Capacity is the upper bound of a range slab.
const parseWeightSlab = (value) => {
  const cleaned = collapseWhitespace(stripBracketedText(value)).toUpperCase();
  const match = cleaned.match(SLAB_LABEL_PATTERN);
  if (!match) return null;

  const from = Number(match[1]);
  const to = match[2] !== undefined ? Number(match[2]) : null;
  if (to !== null && to <= from) return null;

  return {
    label: to === null ? `${from} ${DEFAULT_WEIGHT_UNIT}` : `${from}-${to} ${DEFAULT_WEIGHT_UNIT}`,
    capacity: to === null ? from : to,
  };
};

// Best-effort capacity for a descriptive vehicle type name such as
// "5 to 6 MT (20FT ODC) WITH 2 PROPER TARPAULIN" -> 6. Returns 0 when no
// tonnage is present.
const parseVehicleCapacity = (vehicleName) => {
  const tonnages = [...String(vehicleName ?? "").matchAll(TONNAGE_PATTERN)].map((m) => Number(m[1]));
  return tonnages.length ? Math.max(...tonnages) : 0;
};

module.exports = { parseWeightSlab, parseVehicleCapacity, collapseWhitespace };
