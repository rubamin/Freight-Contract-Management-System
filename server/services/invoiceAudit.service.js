const { Op } = require("sequelize");
const {
  ContractMaster,
  ContractRateMatrix,
  ContractCharge,
  ContractZoneRate,
  DestinationMaster,
  VehicleType,
  WeightMaster,
} = require("../models");
const { CONTRACT_TYPES, CONTRACT_TYPE_LABELS, CHARGE_CODES, ODA_APPROVAL_CATEGORY } = require("../constants/contractTypes");
const { VERIFICATION_STATUS_APPROVED, VERIFICATION_STATUS_DISCREPANCY } = require("../constants/invoiceStatus");
const { parseWeightSlab, parseVehicleCapacity } = require("../utils/weightSlab");
const { lookupDistrictForCity } = require("../constants/indiaCityDistrictLookup");

// Billed amounts up to this much above the contract amount still pass.
const AMOUNT_TOLERANCE = 1.0;
// Vendors bill the contract rate rounded (per MT to the rupee, per KG to
// the paisa), so half a unit of that rounding is allowed per MT / KG.
const RATE_ROUNDING_PER_MT = 0.5;
const RATE_ROUNDING_PER_KG = 0.005;

const COVERAGE_SEPARATOR = /[/,]/;

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundAmount = (value) => Math.round(value * 100) / 100;

const formatAmount = (value) => `Rs ${toNumber(value).toFixed(2)}`;

// The contract an invoice is audited against: the one explicitly chosen,
// otherwise the vendor's ACTIVE contract of the invoice's contract type.
const findContractForInvoice = ({ contractId, vendorId, contractType }, transaction) =>
  contractId
    ? ContractMaster.findByPk(contractId, { transaction })
    : ContractMaster.findOne({ where: { VendorID: vendorId, ContractType: contractType, Status: "ACTIVE" }, transaction });

const findDestination = (city, transaction) =>
  city ? DestinationMaster.findOne({ where: { City: { [Op.like]: city.trim() } }, transaction }) : null;

// Picks the contract rate for the invoice's Vehicle Type among one
// destination's rate matrix entries:
//  - rows that carry a VehicleTypeID match on that ID;
//  - older Sheet 1 rows that only carry a WeightID match when the Vehicle
//    Type name is a plain slab ("10 MT") whose capacity equals the weight.
const findRateForVehicleType = (entries, vehicleTypeRecord) => {
  const exactMatch = entries.find(m => m.VehicleTypeID !== null && String(m.VehicleTypeID) === String(vehicleTypeRecord.VehicleTypeID));
  if (exactMatch) return exactMatch;

  const slab = parseWeightSlab(vehicleTypeRecord.VehicleName);
  if (!slab) return null;
  return entries.find(m => m.VehicleTypeID === null && m.weight && Number(m.weight.Weight) === slab.capacity) || null;
};

// First band (sorted by its lower bound) whose upper bound covers the
// weight; a band without an upper bound covers everything above it.
const findBandForWeight = (bands, weight, fromKey = "WeightFromKG", toKey = "WeightToKG") =>
  [...bands]
    .sort((a, b) => toNumber(a[fromKey]) - toNumber(b[fromKey]))
    .find((band) => band[toKey] === null || band[toKey] === undefined || weight <= toNumber(band[toKey])) || null;

const chargesByCode = (charges, code) => charges.filter((charge) => charge.ChargeCode === code);

const singleChargeAmount = (charges, code) => {
  const charge = chargesByCode(charges, code)[0];
  return charge ? toNumber(charge.Amount) : null;
};

// Chargeable weight in KG: the higher of actual / charged weight and the
// contract's minimum chargeable weight.
const getChargeableWeightKg = (row, charges) =>
  Math.max(toNumber(row.actualWeight), toNumber(row.chargedWeight), singleChargeAmount(charges, CHARGE_CODES.MIN_CHARGEABLE_WEIGHT_KG) || 0);

// A charge with a fixed contract amount is expected only when it is billed;
// a charge the contract leaves blank is accepted at actual.
const expectFixedCharge = (billed, contractAmount, label, issues, notes) => {
  if (billed <= 0) return 0;
  if (contractAmount === null) {
    notes.push(`${label} accepted at actual (${formatAmount(billed)}).`);
    return billed;
  }
  if (billed > contractAmount + AMOUNT_TOLERANCE) {
    issues.push(`${label} billed ${formatAmount(billed)} against contract ${formatAmount(contractAmount)}.`);
  }
  // The contract amount is a ceiling - a lower bill is payable as billed.
  return Math.min(billed, contractAmount);
};

// ---------------------------------------------------------------------
// FTL Inbound - PMT rate of pick-up location x vehicle size
// ---------------------------------------------------------------------

const auditFtlInbound = async ({ contract, row, destination }, issues, transaction) => {
  if (row.hasVehicleTypeNotFound) {
    issues.push("Vehicle type is not available in master.");
    return { expectedFreight: 0 };
  }
  const entries = destination
    ? await ContractRateMatrix.findAll({
      where: { ContractID: contract.ContractID, DestinationID: destination.DestinationID },
      include: [{ model: WeightMaster, as: "weight" }],
      transaction,
    })
    : [];
  if (!entries.length) {
    issues.push(`Pick up location '${row.city}' is not available in the contract rate matrix.`);
    return { expectedFreight: 0, destinationMissing: true };
  }

  const vehicleTypeRecord = await VehicleType.findByPk(row.vehicleTypeId, { transaction });
  // Inbound slabs are vehicle sizes, so a descriptive vehicle type such as
  // "30 MT OPEN TRUCK" also matches the "30 MT" slab by its capacity.
  const capacity = vehicleTypeRecord ? parseVehicleCapacity(vehicleTypeRecord.VehicleName) : 0;
  const matrix = vehicleTypeRecord
    ? findRateForVehicleType(entries, vehicleTypeRecord)
      || entries.find((entry) => capacity > 0 && entry.weight && Number(entry.weight.Weight) === capacity)
      || null
    : null;
  if (!matrix) {
    issues.push(`Vehicle type '${vehicleTypeRecord?.VehicleName || ""}' has no rate in the contract for '${row.city}'.`);
    return { expectedFreight: 0, vehicleMismatch: true };
  }

  const quantity = toNumber(row.actualWeight);
  if (quantity <= 0) {
    issues.push("Qty (MT) is required to check the per MT contract rate.");
    return { expectedFreight: 0 };
  }

  const rate = toNumber(matrix.BaseRate);
  return {
    expectedFreight: roundAmount(rate * quantity),
    freightTolerance: quantity * RATE_ROUNDING_PER_MT,
    rateNote: `${quantity} MT x ${formatAmount(rate)} PMT (${row.city}, ${vehicleTypeRecord.VehicleName})`,
  };
};

// ---------------------------------------------------------------------
// PTL Outbound - rate per KG of destination + docket slab + flat ODA
// ---------------------------------------------------------------------

const auditPtlOutbound = async ({ contract, row, destination, charges }, issues, notes, transaction) => {
  const matrix = destination
    ? await ContractRateMatrix.findOne({
      where: { ContractID: contract.ContractID, DestinationID: destination.DestinationID },
      transaction,
    })
    : null;
  if (!matrix) {
    issues.push(`Destination '${row.city}' is not available in the contract rate matrix.`);
    return { expectedFreight: 0, expectedCharges: 0, destinationMissing: true };
  }

  const weight = getChargeableWeightKg(row, charges);
  const maxWeight = singleChargeAmount(charges, CHARGE_CODES.MAX_WEIGHT_PER_LR_KG);
  if (maxWeight && weight > maxWeight) {
    issues.push(`Chargeable weight ${weight} KG is above the contract limit of ${maxWeight} KG per LR.`);
  }

  const docketSlab = findBandForWeight(chargesByCode(charges, CHARGE_CODES.DOCKET_SLAB), weight);
  const expectedDocket = expectFixedCharge(row.docketCharge, docketSlab ? toNumber(docketSlab.Amount) : null, "Docket / bilty charge", issues, notes);
  const expectedOda = expectFixedCharge(row.odaCharge, singleChargeAmount(charges, CHARGE_CODES.ODA_FLAT), "ODA charge", issues, notes);

  const rate = toNumber(matrix.BaseRate);
  return {
    expectedFreight: roundAmount(rate * weight),
    freightTolerance: weight * RATE_ROUNDING_PER_KG,
    expectedCharges: expectedDocket + expectedOda,
    rateNote: `${weight} KG x ${formatAmount(rate)} / KG (${row.city})`,
  };
};

// ---------------------------------------------------------------------
// Part Load - zone rate per KG + ODA matrix + docket / FOV
// ---------------------------------------------------------------------

const splitCoverage = (coverage) =>
  String(coverage || "").split(COVERAGE_SEPARATOR).map((part) => part.trim().toUpperCase()).filter(Boolean);

// Matches the delivery city to a zone - a city listed in a zone's coverage
// wins over a state match (from the city lookup or the destination master).
const findZoneCode = (zoneRates, city, destination) => {
  const cityKey = city.trim().toUpperCase();
  const cityZone = zoneRates.find((zone) => splitCoverage(zone.Coverage).includes(cityKey));
  if (cityZone) return cityZone.ZoneCode;

  const states = [
    ...lookupDistrictForCity(city).map((match) => match.state),
    destination?.State,
  ].filter(Boolean).map((state) => state.toUpperCase());
  const stateZone = zoneRates.find((zone) => splitCoverage(zone.Coverage).some((part) => states.includes(part)));
  return stateZone ? stateZone.ZoneCode : null;
};

const expectOdaCharge = (row, weight, charges, issues, notes) => {
  if (row.odaCharge <= 0) return 0;
  const category = String(row.odaCategory || "").toUpperCase();
  if (!category) {
    issues.push("ODA charge is billed but no ODA category is selected.");
    return row.odaCharge;
  }
  if (category === ODA_APPROVAL_CATEGORY) {
    issues.push(`ODA category ${ODA_APPROVAL_CATEGORY} is 'on approval' as per contract.`);
    return row.odaCharge;
  }

  const band = findBandForWeight(chargesByCode(charges, CHARGE_CODES.ODA_MATRIX).filter((c) => c.Category === category), weight);
  if (!band) {
    notes.push(`ODA category ${category} accepted at actual (${formatAmount(row.odaCharge)}).`);
    return row.odaCharge;
  }
  const minimum = chargesByCode(charges, CHARGE_CODES.ODA_MINIMUM).find((c) => c.Category === category);
  const expected = roundAmount(Math.max(toNumber(minimum?.Amount), toNumber(band.Amount) * weight));
  if (row.odaCharge > expected + AMOUNT_TOLERANCE) {
    issues.push(`ODA charge billed ${formatAmount(row.odaCharge)} against contract ${formatAmount(expected)} (category ${category}).`);
  }
  return Math.min(row.odaCharge, expected);
};

const auditPartLoad = async ({ contract, row, destination, charges }, issues, notes, transaction) => {
  const zoneRates = await ContractZoneRate.findAll({ where: { ContractID: contract.ContractID }, transaction });
  const zoneCode = row.city ? findZoneCode(zoneRates, row.city, destination) : null;
  if (!zoneCode) {
    issues.push(`Delivery city '${row.city}' is not covered by any zone of the contract.`);
    return { expectedFreight: 0, expectedCharges: 0, destinationMissing: true };
  }

  const weight = getChargeableWeightKg(row, charges);
  const band = findBandForWeight(zoneRates.filter((zone) => zone.ZoneCode === zoneCode), weight);
  if (!band) {
    issues.push(`Zone '${zoneCode}' has no rate for ${weight} KG.`);
    return { expectedFreight: 0, expectedCharges: 0 };
  }

  const expectedOda = expectOdaCharge(row, weight, charges, issues, notes);
  const expectedDocket = expectFixedCharge(row.docketCharge, singleChargeAmount(charges, CHARGE_CODES.DOCKET_CHARGE), "Docket charge", issues, notes);
  const expectedFov = expectFixedCharge(row.fovCharge, singleChargeAmount(charges, CHARGE_CODES.FOV_CHARGE), "FOV charge", issues, notes);

  const rate = toNumber(band.RatePerKG);
  return {
    expectedFreight: roundAmount(rate * weight),
    freightTolerance: weight * RATE_ROUNDING_PER_KG,
    expectedCharges: expectedOda + expectedDocket + expectedFov,
    rateNote: `${weight} KG x ${formatAmount(rate)} / KG (zone ${zoneCode})`,
  };
};

const TYPE_AUDITS = {
  [CONTRACT_TYPES.FTL_INBOUND]: (context, issues, notes, transaction) => auditFtlInbound(context, issues, transaction),
  [CONTRACT_TYPES.PTL_OUTBOUND]: auditPtlOutbound,
  [CONTRACT_TYPES.PART_LOAD]: auditPartLoad,
};

// Billed contract charges of a typed invoice row (docket / ODA / FOV).
const billedContractCharges = (row) => row.docketCharge + row.odaCharge + row.fovCharge;

// Audits one FTL Inbound / PTL Outbound / Part Load invoice row. Returns
// the same shape as the FTL Outbound audit in invoiceDocumentController,
// plus expectedCharges (contract value of docket / ODA / FOV).
const computeTypedContractAudit = async (row, transaction) => {
  const contract = await findContractForInvoice(row, transaction);
  const destination = await findDestination(row.city, transaction);
  const base = {
    destination,
    activeContract: contract,
    targetContractId: contract?.ContractID || null,
    calculatedExpectedFreight: 0,
    expectedCharges: 0,
    hasContractMatchFailure: false,
    hasDestinationMismatch: false,
    hasVehicleTypeMismatch: false,
  };

  if (!contract) {
    return {
      ...base,
      hasContractMatchFailure: true,
      finalAuditDecision: VERIFICATION_STATUS_DISCREPANCY,
      auditRemarks: `No active ${CONTRACT_TYPE_LABELS[row.contractType]} contract found for vendor with PAN '${row.extractedPAN}'.`,
      variance: 0,
    };
  }

  const charges = await ContractCharge.findAll({ where: { ContractID: contract.ContractID }, transaction });
  const issues = [];
  const notes = [];
  const result = await TYPE_AUDITS[row.contractType]({ contract, row, destination, charges }, issues, notes, transaction);

  const expectedFreight = result.expectedFreight || 0;
  const expectedCharges = result.expectedCharges || 0;
  const freightLimit = expectedFreight + AMOUNT_TOLERANCE + (result.freightTolerance || 0);
  if (!issues.length && row.freightCharge > freightLimit) {
    issues.push(`Freight billed ${formatAmount(row.freightCharge)} against contract ${formatAmount(expectedFreight)} [${result.rateNote}].`);
  }

  const variance = roundAmount(row.freightCharge + billedContractCharges(row) - expectedFreight - expectedCharges);
  const passed = !issues.length;
  const auditRemarks = passed
    ? [`Verification passed against contract freight of ${formatAmount(expectedFreight)} [${result.rateNote}].`, ...notes].join(" ")
    : [`Discrepancy detected! ${issues.join(" ")}`, ...notes].join(" ");

  return {
    ...base,
    calculatedExpectedFreight: expectedFreight,
    expectedCharges,
    hasDestinationMismatch: Boolean(result.destinationMissing),
    hasVehicleTypeMismatch: Boolean(result.vehicleMismatch),
    finalAuditDecision: passed ? VERIFICATION_STATUS_APPROVED : VERIFICATION_STATUS_DISCREPANCY,
    auditRemarks,
    variance,
  };
};

module.exports = {
  findContractForInvoice,
  findRateForVehicleType,
  computeTypedContractAudit,
};
