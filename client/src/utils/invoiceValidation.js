export const hasAdditionalCharges = (row) =>
  Number(row.detainCharge) > 0 || Number(row.extraCharge) > 0;

export const isCustomerNameRequired = (row) =>
  hasAdditionalCharges(row) && !String(row.customerName || "").trim();

export const optionalWeightValue = (value) =>
  String(value ?? "").trim() === "" ? null : Number.parseFloat(value);
