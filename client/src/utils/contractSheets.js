import { CONTRACT_TYPES, ODA_CATEGORY_OPTIONS } from "../constants/contractTypes";
import {
  CHARGE_CODES,
  CHARGE_DEFINITIONS_BY_TYPE,
  ODA_DISTANCE_ROW,
  ODA_MINIMUM_ROW,
  SHEET_IDS,
  getSheetConfigs,
} from "../constants/contractSheets";
import { getSlabLabel } from "./rateMatrix";

// Converts the rate data of an FTL Inbound, PTL Outbound or Part Load
// contract into editable sheets ({ valueColumns, rows } per sheet) and the
// edited sheets back into the payload the server validates and saves.

let lastRowId = 0;
export const newRowId = () => `row-${++lastRowId}`;

const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";

const cellText = (value) => {
  if (isBlank(value)) return "";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value);
};

// null for a blank cell, NaN for a cell that is not a number.
const toNumber = (value) => {
  if (isBlank(value)) return null;
  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : NaN;
};

const newRow = (cells) => ({ id: newRowId(), cells });

// A row the sheet always has (its label cannot be changed or deleted).
const newFixedRow = (cells) => ({ ...newRow(cells), fixed: true });

export const createEmptyRow = () => newRow({});

// ---------------------------------------------------------------------
// Column header parsers (also used by "Add column")
// ---------------------------------------------------------------------

const VEHICLE_SLAB_PATTERN = /^(\d+(?:\.\d+)?)(?:\s*(?:-|TO)\s*(\d+(?:\.\d+)?))?\s*MT$/;
const UP_TO_KG_PATTERN = /^UP\s*TO\s*(\d+(?:\.\d+)?)\s*KGS?$/;
const ABOVE_KG_PATTERN = /^ABOVE\s*(\d+(?:\.\d+)?)\s*KGS?$/;
const RANGE_KG_PATTERN = /^(\d+(?:\.\d+)?)\s*(?:-|TO)\s*(\d+(?:\.\d+)?)\s*KGS?$/;
const ODA_RANGE_PATTERN = /^(\d+(?:\.\d+)?)\s*(?:-|TO)\s*(\d+(?:\.\d+)?)/;
const ODA_ABOVE_PATTERN = /^(?:(\d+(?:\.\d+)?)\s*(?:KG\s*)?(?:&\s*)?ABOVE|ABOVE\s*(\d+(?:\.\d+)?))/;

const normalizeHeader = (value) => String(value || "").toUpperCase().replace(/\s+/g, " ").trim();

const slabColumn = (label) => ({ key: `slab:${label}`, label });

const bandLabel = (from, to) => {
  if (to === null) return `ABOVE ${from} KG`;
  return from === 0 ? `UP TO ${to} KG` : `${from}-${to} KG`;
};

const bandColumn = (from, to) => ({ key: `band:${from}:${to ?? ""}`, label: bandLabel(from, to), from, to });

// "25 MT" / "20-21 MT" -> column, or null when the text is not a vehicle size.
const parseVehicleSlabHeader = (text) => {
  const match = normalizeHeader(text).match(VEHICLE_SLAB_PATTERN);
  if (!match) return null;
  const from = Number(match[1]);
  const to = match[2] === undefined ? null : Number(match[2]);
  if (to !== null && to <= from) return null;
  return slabColumn(to === null ? `${from} MT` : `${from}-${to} MT`);
};

// "UP TO 1000 KG" / "ABOVE 1000 KG" / "1001-5000 KG" -> column, or null.
const parseKgBandHeader = (text) => {
  const header = normalizeHeader(text);
  let match = header.match(UP_TO_KG_PATTERN);
  if (match) return bandColumn(0, Number(match[1]));
  match = header.match(ABOVE_KG_PATTERN);
  if (match) return bandColumn(Number(match[1]), null);
  match = header.match(RANGE_KG_PATTERN);
  if (match && Number(match[2]) > Number(match[1])) return bandColumn(Number(match[1]), Number(match[2]));
  return null;
};

const COLUMN_PARSERS = {
  vehicleSlab: parseVehicleSlabHeader,
  kgBand: parseKgBandHeader,
};

export const parseColumnHeader = (kind, text) => COLUMN_PARSERS[kind]?.(text) || null;

// ---------------------------------------------------------------------
// Contract -> sheets
// ---------------------------------------------------------------------

const groupBy = (items, getKey) =>
  items.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
    return groups;
  }, new Map());

const cityOf = (rate) => rate.destination?.City || "";

const buildInboundRateSheet = (rateMatrix) => {
  const valueColumns = [...new Set(rateMatrix.map(getSlabLabel))].map(slabColumn);
  const rows = [...groupBy(rateMatrix, (rate) => cityOf(rate).toUpperCase()).values()].map((rates) => {
    const first = rates[0];
    const cells = {
      destination: cityOf(first),
      deliveryLocation: first.DeliveryLocation || "",
      distanceKm: cellText(first.DistanceKM),
      transitDays: cellText(first.TransitDays),
    };
    rates.forEach((rate) => { cells[slabColumn(getSlabLabel(rate)).key] = cellText(rate.BaseRate); });
    return newRow(cells);
  });
  return { valueColumns, rows };
};

const buildPtlRateSheet = (rateMatrix, config) => ({
  valueColumns: config.valueColumns,
  rows: rateMatrix.map((rate) => newRow({ destination: cityOf(rate), rate: cellText(rate.BaseRate) })),
});

const buildDocketSheet = (charges, config) => ({
  valueColumns: config.valueColumns,
  rows: charges
    .filter((charge) => charge.ChargeCode === CHARGE_CODES.DOCKET_SLAB)
    .sort((a, b) => Number(a.WeightFromKG) - Number(b.WeightFromKG))
    .map((charge) => newRow({ fromKg: cellText(charge.WeightFromKG), toKg: cellText(charge.WeightToKG), charge: cellText(charge.Amount) })),
});

const toBand = (from, to) => ({ from: Number(from), to: isBlank(to) ? null : Number(to) });

const buildZoneSheet = (zoneRates) => {
  const bands = [...new Map(
    zoneRates.map((zone) => {
      const band = toBand(zone.WeightFromKG, zone.WeightToKG);
      return [`${band.from}:${band.to}`, band];
    })
  ).values()].sort((a, b) => a.from - b.from);
  const valueColumns = bands.map((band) => bandColumn(band.from, band.to));

  const rows = [...groupBy(zoneRates, (zone) => String(zone.ZoneCode).toUpperCase()).values()].map((zones) => {
    const cells = { zone: zones[0].ZoneCode, coverage: zones[0].Coverage };
    zones.forEach((zone) => {
      const band = toBand(zone.WeightFromKG, zone.WeightToKG);
      cells[bandColumn(band.from, band.to).key] = cellText(zone.RatePerKG);
    });
    return newRow(cells);
  });
  return { valueColumns, rows };
};

const odaWeightLabel = (charge) => {
  const band = toBand(charge.WeightFromKG, charge.WeightToKG);
  return band.to === null ? `${band.from} ABOVE` : `${band.from}-${band.to}`;
};

const stripKmSuffix = (remarks) => String(remarks || "").replace(/\s*KM$/i, "").trim();

// Row order follows the template: DISTANCE, MINIMUM, then weight ranges.
// Distances come from ODA_DISTANCE rows; older contracts only have them
// as the remark of their rate rows.
const buildOdaSheet = (charges, config) => {
  const odaCodes = [CHARGE_CODES.ODA_MATRIX, CHARGE_CODES.ODA_MINIMUM, CHARGE_CODES.ODA_DISTANCE];
  const odaCharges = charges.filter((charge) => odaCodes.includes(charge.ChargeCode));
  const distanceCells = { weight: ODA_DISTANCE_ROW };
  const minimumCells = { weight: ODA_MINIMUM_ROW };
  const bandRows = new Map();

  odaCharges
    .filter((charge) => charge.ChargeCode === CHARGE_CODES.ODA_DISTANCE)
    .forEach((charge) => { distanceCells[charge.Category] = stripKmSuffix(charge.Remarks); });

  odaCharges.filter((charge) => charge.ChargeCode !== CHARGE_CODES.ODA_DISTANCE).forEach((charge) => {
    if (charge.Remarks && !distanceCells[charge.Category]) distanceCells[charge.Category] = stripKmSuffix(charge.Remarks);
    if (charge.ChargeCode === CHARGE_CODES.ODA_MINIMUM) {
      minimumCells[charge.Category] = cellText(charge.Amount);
      return;
    }
    const label = odaWeightLabel(charge);
    if (!bandRows.has(label)) bandRows.set(label, { weight: label, sortKey: Number(charge.WeightFromKG) });
    bandRows.get(label)[charge.Category] = cellText(charge.Amount);
  });

  const sortedBands = [...bandRows.values()].sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey, ...cells }) => newRow(cells));
  return { valueColumns: config.valueColumns, rows: [newFixedRow(distanceCells), newFixedRow(minimumCells), ...sortedBands] };
};

const buildChargesSheet = (charges, contractType, config) => ({
  valueColumns: config.valueColumns,
  rows: CHARGE_DEFINITIONS_BY_TYPE[contractType].map(({ code, label }) => {
    const charge = charges.find((item) => item.ChargeCode === code);
    return newRow({ code, label, amount: cellText(charge?.Amount), remarks: charge?.Remarks || "" });
  }),
});

const SHEET_BUILDERS = {
  [SHEET_IDS.RATE_MATRIX]: ({ contractType, rateMatrix }, config) =>
    (contractType === CONTRACT_TYPES.FTL_INBOUND ? buildInboundRateSheet(rateMatrix) : buildPtlRateSheet(rateMatrix, config)),
  [SHEET_IDS.DOCKET_SLABS]: ({ charges }, config) => buildDocketSheet(charges, config),
  [SHEET_IDS.ZONE_RATES]: ({ zoneRates }) => buildZoneSheet(zoneRates),
  [SHEET_IDS.ODA_MATRIX]: ({ charges }, config) => buildOdaSheet(charges, config),
  [SHEET_IDS.CHARGES]: ({ contractType, charges }, config) => buildChargesSheet(charges, contractType, config),
};

// { [sheetId]: { valueColumns, rows } } for every sheet of the contract's type.
export const buildContractSheets = (contract) => {
  const source = {
    contractType: contract?.ContractType,
    rateMatrix: contract?.rateMatrix || [],
    charges: contract?.charges || [],
    zoneRates: contract?.zoneRates || [],
  };
  return Object.fromEntries(
    getSheetConfigs(source.contractType).map((config) => [config.id, SHEET_BUILDERS[config.id](source, config)])
  );
};

// ---------------------------------------------------------------------
// Sheets -> payload (with the same checks the server makes)
// ---------------------------------------------------------------------

const valueCells = (row, valueColumns) =>
  valueColumns.map((col) => ({ col, value: row.cells[col.key] })).filter(({ value }) => !isBlank(value));

const hasAnyCell = (row) => Object.entries(row.cells).some(([key, value]) => !["code", "label"].includes(key) && !isBlank(value));

const checkPositive = (value, where, errors) => {
  const number = toNumber(value);
  if (number === null || Number.isNaN(number) || number <= 0) {
    errors.push(`${where}: '${value}' must be a number greater than 0.`);
    return null;
  }
  return number;
};

const checkOptionalNumber = (value, where, errors) => {
  const number = toNumber(value);
  if (Number.isNaN(number) || number < 0) {
    errors.push(`${where}: '${value}' must be a positive number.`);
    return null;
  }
  return number;
};

const rateRowsPayload = ({ valueColumns, rows }, contractType, errors) => {
  const seen = new Set();
  const rateRows = [];
  rows.filter(hasAnyCell).forEach((row, index) => {
    const destination = String(row.cells.destination || "").trim();
    const where = `Rate Matrix '${destination || `row ${index + 1}`}'`;
    if (!destination) {
      errors.push(`Rate Matrix row ${index + 1}: destination is required.`);
      return;
    }
    if (seen.has(destination.toUpperCase())) {
      errors.push(`${where}: listed more than once.`);
      return;
    }
    seen.add(destination.toUpperCase());

    const filled = valueCells(row, valueColumns);
    if (!filled.length) errors.push(`${where}: enter at least one rate.`);
    filled.forEach(({ col, value }) => {
      const rate = checkPositive(value, `${where} / ${col.label}`, errors);
      if (rate === null) return;
      rateRows.push(contractType === CONTRACT_TYPES.FTL_INBOUND
        ? {
          destination,
          slabLabel: col.label,
          rate,
          deliveryLocation: row.cells.deliveryLocation || null,
          distanceKm: checkOptionalNumber(row.cells.distanceKm, `${where} distance`, errors),
          transitDays: checkOptionalNumber(row.cells.transitDays, `${where} TT days`, errors),
        }
        : { destination, rate });
    });
  });
  if (!rateRows.length && !errors.length) errors.push("Rate Matrix: at least one rate is required.");
  return rateRows;
};

const chargesPayload = ({ rows }, errors) =>
  rows.filter((row) => !isBlank(row.cells.amount)).flatMap((row) => {
    const amount = toNumber(row.cells.amount);
    if (Number.isNaN(amount) || amount < 0) {
      errors.push(`Charges '${row.cells.label}': amount must be 0 or more.`);
      return [];
    }
    return [{ ChargeCode: row.cells.code, Amount: amount, Remarks: row.cells.remarks || null }];
  });

const docketPayload = ({ rows }, errors) => {
  const slabs = rows.filter(hasAnyCell).flatMap((row, index) => {
    const from = toNumber(row.cells.fromKg);
    const to = toNumber(row.cells.toKg);
    const charge = toNumber(row.cells.charge);
    const invalid = from === null || Number.isNaN(from) || Number.isNaN(to) || (to !== null && to < from)
      || charge === null || Number.isNaN(charge) || charge < 0;
    if (invalid) {
      errors.push(`Docket Slabs row ${index + 1}: FROM KG and CHARGE are required numbers and TO KG cannot be below FROM KG.`);
      return [];
    }
    return [{ ChargeCode: CHARGE_CODES.DOCKET_SLAB, WeightFromKG: from, WeightToKG: to, Amount: charge }];
  });
  if (!slabs.length) errors.push("Docket Slabs: at least one docket slab is required.");
  return slabs;
};

const zoneRatesPayload = ({ valueColumns, rows }, errors) => {
  const seen = new Set();
  const zoneRates = [];
  rows.filter(hasAnyCell).forEach((row, index) => {
    const zone = String(row.cells.zone || "").trim();
    const coverage = String(row.cells.coverage || "").trim();
    if (!zone || !coverage) {
      errors.push(`Zone Rates row ${index + 1}: ZONE and COVERAGE are both required.`);
      return;
    }
    if (seen.has(zone.toUpperCase())) {
      errors.push(`Zone Rates: zone '${zone}' is listed more than once.`);
      return;
    }
    seen.add(zone.toUpperCase());

    const filled = valueCells(row, valueColumns);
    if (!filled.length) errors.push(`Zone Rates '${zone}': enter at least one rate.`);
    filled.forEach(({ col, value }) => {
      const rate = checkPositive(value, `Zone Rates '${zone}' / ${col.label}`, errors);
      if (rate !== null) zoneRates.push({ ZoneCode: zone, Coverage: coverage, WeightFromKG: col.from, WeightToKG: col.to, RatePerKG: rate });
    });
  });
  if (!zoneRates.length && !errors.length) errors.push("Zone Rates: at least one zone rate is required.");
  return zoneRates;
};

const parseOdaWeight = (label) => {
  let match = label.match(ODA_RANGE_PATTERN);
  if (match) return { from: Number(match[1]), to: Number(match[2]) };
  match = label.match(ODA_ABOVE_PATTERN);
  if (match) return { from: Number(match[1] ?? match[2]), to: null };
  return null;
};

const odaPayload = ({ rows }, errors) => {
  const distanceRow = rows.find((row) => normalizeHeader(row.cells.weight).startsWith("DISTANCE"));
  const remarksFor = (category) => (isBlank(distanceRow?.cells[category]) ? null : `${String(distanceRow.cells[category]).trim()} KM`);
  const distances = ODA_CATEGORY_OPTIONS.filter((category) => remarksFor(category)).map((category) => ({
    ChargeCode: CHARGE_CODES.ODA_DISTANCE, Category: category, Amount: 0, Remarks: remarksFor(category),
  }));

  const amounts = rows.filter((row) => row !== distanceRow && hasAnyCell(row)).flatMap((row, index) => {
    const label = normalizeHeader(row.cells.weight);
    const isMinimum = label.startsWith("MINIMUM");
    const band = isMinimum ? null : parseOdaWeight(label);
    if (!isMinimum && !band) {
      errors.push(`ODA Matrix row ${index + 1}: '${row.cells.weight || ""}' is not a weight range (e.g. '0-350' or '1501 ABOVE').`);
      return [];
    }
    return ODA_CATEGORY_OPTIONS.filter((category) => !isBlank(row.cells[category])).flatMap((category) => {
      const amount = toNumber(row.cells[category]);
      if (Number.isNaN(amount) || amount < 0) {
        errors.push(`ODA Matrix '${row.cells.weight}' / ${category}: amount must be 0 or more.`);
        return [];
      }
      const base = { Category: category, Amount: amount, Remarks: remarksFor(category) };
      return [isMinimum
        ? { ...base, ChargeCode: CHARGE_CODES.ODA_MINIMUM }
        : { ...base, ChargeCode: CHARGE_CODES.ODA_MATRIX, WeightFromKG: band.from, WeightToKG: band.to }];
    });
  });
  return [...amounts, ...distances];
};

// Returns { payload: { rateRows, charges, zoneRates }, errors }.
export const buildSheetsPayload = (contractType, sheets) => {
  const errors = [];
  const sheet = (id) => sheets[id] || { valueColumns: [], rows: [] };
  const has = (id) => Boolean(sheets[id]);

  const payload = {
    rateRows: has(SHEET_IDS.RATE_MATRIX) ? rateRowsPayload(sheet(SHEET_IDS.RATE_MATRIX), contractType, errors) : [],
    zoneRates: has(SHEET_IDS.ZONE_RATES) ? zoneRatesPayload(sheet(SHEET_IDS.ZONE_RATES), errors) : [],
    charges: [
      ...chargesPayload(sheet(SHEET_IDS.CHARGES), errors),
      ...(has(SHEET_IDS.DOCKET_SLABS) ? docketPayload(sheet(SHEET_IDS.DOCKET_SLABS), errors) : []),
      ...(has(SHEET_IDS.ODA_MATRIX) ? odaPayload(sheet(SHEET_IDS.ODA_MATRIX), errors) : []),
    ],
  };
  return { payload, errors };
};
