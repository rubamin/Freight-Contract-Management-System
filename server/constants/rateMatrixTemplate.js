// Layout of the contract Rate Matrix Excel template
// (client/public/templates/Contract_RateMatrix_Import_Template.xlsx).
// The import parser only accepts workbooks that follow this layout.

const RATE_MATRIX_SHEETS = {
  DOMESTIC: "DOMESTIC DESTINATIONS",
  ADDITIONAL: "ADDITIONAL DESTINATIONS",
  INSTRUCTIONS: "INSTRUCTIONS",
};

const RATE_MATRIX_HEADERS = {
  DESTINATION: "DESTINATION",
  VEHICLE_TYPE: "VEHICLE TYPE",
  FREIGHT_KEYWORD: "FREIGHT",
  DISTANCE_KEYWORDS: ["DISTANCE", "KM"],
  SERIAL_NUMBER_PATTERN: /^SR\.?\s*NO\.?$/,
};

// The header row must be found within this many rows from the top.
const HEADER_SEARCH_ROW_LIMIT = 15;

// A destination cell starting with any of these ends the data table
// (signature / remark blocks that vendors add below the rates).
const TABLE_END_PATTERN = /^(REMARK|NOTE|PREPARED BY|APPROVED BY|DETENTION|YOURS TRULY)/i;

// Upper limit on validation messages returned to the user per upload.
const MAX_REPORTED_IMPORT_ERRORS = 20;

const DEFAULT_WEIGHT_UNIT = "MT";

module.exports = {
  RATE_MATRIX_SHEETS,
  RATE_MATRIX_HEADERS,
  HEADER_SEARCH_ROW_LIMIT,
  TABLE_END_PATTERN,
  MAX_REPORTED_IMPORT_ERRORS,
  DEFAULT_WEIGHT_UNIT,
};
