import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CONTRACT_TYPES } from "../../constants/contractTypes";

// Read-only rate matrix, zone rates and charges of an FTL Inbound,
// PTL Outbound or Part Load contract. Rates are changed by uploading a
// new Excel on the Edit Contract page.

const CHARGE_LABELS = {
  DETENTION_PER_DAY: "Detention per day",
  LOADING_UNLOADING: "Loading / Unloading",
  MIN_CHARGEABLE_WEIGHT_KG: "Minimum chargeable weight (KG)",
  MAX_WEIGHT_PER_LR_KG: "Maximum weight per LR (KG)",
  DOCKET_SLAB: "Docket / Bilty slab",
  DOCKET_CHARGE: "Docket charge per docket",
  FOV_CHARGE: "FOV charge per docket",
  ODA_FLAT: "ODA door delivery per location",
  ODA_MATRIX: "ODA rate per KG",
  ODA_MINIMUM: "ODA minimum",
  ODA_DISTANCE: "ODA distance (reference)",
  GODOWN_DELIVERY_PER_KG: "Godown delivery hamali per KG",
  CASH_RECEIPT_PER_GC: "Cash receipt per GC",
  OTHER_CHARGES_PER_GC: "Other charges per GC",
  DEMURRAGE_PER_KG: "Demurrage per KG",
  HAMALI_VARAI: "Hamali / Varai",
};

const TABLE_MAX_HEIGHT = 420;

const formatNumber = (value) => (value === null || value === undefined || value === "" ? "-" : String(Number(value)));

const formatWeightBand = (from, to) => {
  if (from === null || from === undefined) return "-";
  return to === null || to === undefined ? `${formatNumber(from)} KG & above` : `${formatNumber(from)} - ${formatNumber(to)} KG`;
};

const SimpleTable = ({ title, headers, rows }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
      {title} ({rows.length})
    </Typography>
    {rows.length ? (
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: TABLE_MAX_HEIGHT }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableCell key={header} sx={{ fontWeight: 700, bgcolor: "#f3f4f6" }}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((cells, index) => (
              <TableRow key={index} hover>
                {cells.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <Typography variant="body2" color="text.secondary">No records.</Typography>
    )}
  </Box>
);

const inboundRows = (rateMatrix) =>
  rateMatrix.map((row) => [
    row.destination?.City || "-",
    row.DeliveryLocation || "-",
    formatNumber(row.DistanceKM),
    formatNumber(row.TransitDays),
    row.vehicleType?.VehicleName || "-",
    formatNumber(row.BaseRate),
  ]);

const ptlRows = (rateMatrix) =>
  rateMatrix.map((row) => [row.destination?.City || "-", formatNumber(row.BaseRate)]);

const zoneRows = (zoneRates) =>
  zoneRates.map((zone) => [zone.ZoneCode, zone.Coverage, formatWeightBand(zone.WeightFromKG, zone.WeightToKG), formatNumber(zone.RatePerKG)]);

const chargeRows = (charges) =>
  charges.map((charge) => [
    CHARGE_LABELS[charge.ChargeCode] || charge.ChargeCode,
    charge.Category || "-",
    formatWeightBand(charge.WeightFromKG, charge.WeightToKG),
    formatNumber(charge.Amount),
    charge.Remarks || "-",
  ]);

const ContractTypeRates = ({ contract }) => {
  const type = contract?.ContractType;
  const rateMatrix = contract?.rateMatrix || [];
  const charges = contract?.charges || [];
  const zoneRates = contract?.zoneRates || [];

  return (
    <Box>
      {type === CONTRACT_TYPES.FTL_INBOUND && (
        <SimpleTable
          title="Rate Matrix (Freight per MT)"
          headers={["Pick Up Location", "Delivery Location", "Distance KM", "TT Days", "Vehicle Size", "Rate (PMT)"]}
          rows={inboundRows(rateMatrix)}
        />
      )}
      {type === CONTRACT_TYPES.PTL_OUTBOUND && (
        <SimpleTable title="Rate Matrix (Freight per KG)" headers={["Destination", "Rate / KG"]} rows={ptlRows(rateMatrix)} />
      )}
      {type === CONTRACT_TYPES.PART_LOAD && (
        <SimpleTable title="Zone Rates (Freight per KG)" headers={["Zone", "Coverage", "Weight Band", "Rate / KG"]} rows={zoneRows(zoneRates)} />
      )}
      <SimpleTable
        title="Contract Charges (blank in Excel = paid at actual)"
        headers={["Charge", "Category", "Weight", "Amount (INR)", "Remarks"]}
        rows={chargeRows(charges)}
      />
    </Box>
  );
};

export default ContractTypeRates;
