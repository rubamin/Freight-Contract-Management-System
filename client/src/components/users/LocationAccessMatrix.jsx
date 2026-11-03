import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Search, Factory, LocationOn } from "@mui/icons-material";
import { ACCESS_FLAGS, ACCESS_FLAG_LABELS, applyAccessFlag, applyAccessFlagToMany, getGroupFlagState } from "../../utils/accessMatrix";

const HEADER_SX = { fontWeight: 700, bgcolor: "#F1F5F9", whiteSpace: "nowrap" };
const GROUP_ROW_SX = { bgcolor: "#F8FAFC" };
const OTHER_GROUP_ID = "other";

const byId = (list, idField) => new Map((list || []).map((item) => [String(item[idField]), item]));

// One group per hierarchy Plant: "Company › SBU › Plant" with its locations.
const buildGroups = ({ companies, sbus, plants, locations }) => {
  const companiesById = byId(companies, "CompanyID");
  const sbusById = byId(sbus, "SBUID");
  const plantsById = byId(plants, "PlantHierarchyID");
  const groups = new Map();

  (locations || []).forEach((location) => {
    const plant = plantsById.get(String(location.PlantHierarchyID));
    const sbu = plant && sbusById.get(String(plant.SBUID));
    const company = sbu && companiesById.get(String(sbu.CompanyID));
    const groupId = plant ? String(plant.PlantHierarchyID) : OTHER_GROUP_ID;
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        plantName: plant?.PlantName || "Other locations",
        path: [company?.CompanyName, sbu?.SBUName].filter(Boolean).join(" › "),
        locations: [],
      });
    }
    groups.get(groupId).locations.push(location);
  });

  return [...groups.values()]
    .map((group) => ({ ...group, locations: group.locations.sort((a, b) => String(a.LocationName).localeCompare(String(b.LocationName))) }))
    .sort((a, b) => `${a.path} ${a.plantName}`.localeCompare(`${b.path} ${b.plantName}`));
};

const matchesSearch = (group, location, search) =>
  !search || `${group.path} ${group.plantName} ${location.LocationName}`.toLowerCase().includes(search);

const FlagCheckbox = ({ state, onChange, size }) => (
  <Checkbox size={size} checked={state.checked} indeterminate={state.indeterminate} onChange={(e) => onChange(e.target.checked)} />
);

/**
 * Settings & Hierarchy Access of one user: View / Add / Edit of the
 * invoices of every location, grouped by Company › SBU › Plant.
 * value: { [LocationID]: { canView, canAdd, canEdit } }
 */
const LocationAccessMatrix = ({ hierarchy, value, onChange }) => {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => buildGroups(hierarchy), [hierarchy]);
  const needle = search.trim().toLowerCase();

  const visibleGroups = groups
    .map((group) => ({ ...group, locations: group.locations.filter((location) => matchesSearch(group, location, needle)) }))
    .filter((group) => group.locations.length);
  const visibleIds = visibleGroups.flatMap((group) => group.locations.map((location) => String(location.LocationID)));
  const allIds = groups.flatMap((group) => group.locations.map((location) => String(location.LocationID)));

  const countWith = (flag) => allIds.filter((id) => value[id]?.[flag]).length;

  if (!allIds.length) {
    return <Alert severity="info">No active locations exist yet. Add them under Hierarchy &amp; Approval Workflow.</Alert>;
  }

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search company, SBU, plant or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 320 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Chip size="small" color="primary" variant="outlined" label={`View: ${countWith("canView")}`} />
          <Chip size="small" color="success" variant="outlined" label={`Add: ${countWith("canAdd")}`} />
          <Chip size="small" color="info" variant="outlined" label={`Edit: ${countWith("canEdit")}`} />
          <Button size="small" onClick={() => onChange(applyAccessFlagToMany(value, visibleIds, "canEdit", true))} sx={{ textTransform: "none" }}>
            Full access {needle ? "(shown)" : "(all)"}
          </Button>
          <Button size="small" color="error" onClick={() => onChange(applyAccessFlagToMany(value, visibleIds, "canView", false))} sx={{ textTransform: "none" }}>
            Clear {needle ? "(shown)" : "(all)"}
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={HEADER_SX}>Plant / Location</TableCell>
              {ACCESS_FLAGS.map((flag) => (
                <TableCell key={flag} align="center" sx={{ ...HEADER_SX, width: 110 }}>
                  <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                    <FlagCheckbox
                      size="small"
                      state={getGroupFlagState(value, visibleIds, flag)}
                      onChange={(checked) => onChange(applyAccessFlagToMany(value, visibleIds, flag, checked))}
                    />
                    {ACCESS_FLAG_LABELS[flag]}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleGroups.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>No location matches your search.</TableCell></TableRow>
            )}
            {visibleGroups.map((group) => {
              const groupIds = group.locations.map((location) => String(location.LocationID));
              return (
                <React.Fragment key={group.id}>
                  <TableRow sx={GROUP_ROW_SX}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Factory fontSize="small" color="primary" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{group.plantName}</Typography>
                          {group.path && <Typography variant="caption" color="text.secondary">{group.path}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    {ACCESS_FLAGS.map((flag) => (
                      <TableCell key={flag} align="center">
                        <FlagCheckbox
                          size="small"
                          state={getGroupFlagState(value, groupIds, flag)}
                          onChange={(checked) => onChange(applyAccessFlagToMany(value, groupIds, flag, checked))}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                  {group.locations.map((location) => {
                    const id = String(location.LocationID);
                    return (
                      <TableRow key={id} hover>
                        <TableCell sx={{ pl: 6 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <LocationOn sx={{ fontSize: 16, color: value[id]?.canView ? "success.main" : "text.disabled" }} />
                            <Typography variant="body2">{location.LocationName}</Typography>
                          </Box>
                        </TableCell>
                        {ACCESS_FLAGS.map((flag) => (
                          <TableCell key={flag} align="center">
                            <Checkbox
                              checked={Boolean(value[id]?.[flag])}
                              onChange={(e) => onChange({ ...value, [id]: applyAccessFlag(value[id], flag, e.target.checked) })}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LocationAccessMatrix;
