// Shared unit option lists (task items 9 & 10: Weight Unit and Vehicle
// Type Unit are both dropdowns, not free text). Kept in one constants
// file since both masters draw from the same underlying set of units.
export const WEIGHT_UNIT_OPTIONS = [
  { value: "MT", label: "MT (Metric Ton)" },
  { value: "KG", label: "KG (Kilogram)" },
  { value: "Ton", label: "Ton" },
];

export const DEFAULT_WEIGHT_UNIT = "MT";

export const VEHICLE_TYPE_UNIT_OPTIONS = [
  { value: "MT", label: "MT (Metric Ton)" },
  { value: "KG", label: "KG (Kilogram)" },
  { value: "Ton", label: "Ton" },
  { value: "Feet", label: "Feet" },
];
