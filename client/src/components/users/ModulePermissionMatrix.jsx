import React from "react";
import { Box, Checkbox, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import ModuleIcon from "../common/ModuleIcon";
import { MODULE_LABELS } from "../../constants/modules";
import { ACCESS_FLAGS, ACCESS_FLAG_LABELS, applyAccessFlag, applyAccessFlagToMany, getGroupFlagState } from "../../utils/accessMatrix";

const HEADER_SX = { fontWeight: 700, bgcolor: "#F1F5F9", whiteSpace: "nowrap" };

// View / Add / Edit per module, with a select-all box on every column.
const ModulePermissionMatrix = ({ moduleKeys, value, onChange }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={HEADER_SX}>Module</TableCell>
          {ACCESS_FLAGS.map((flag) => {
            const state = getGroupFlagState(value, moduleKeys, flag);
            return (
              <TableCell key={flag} align="center" sx={HEADER_SX}>
                <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                  <Checkbox
                    size="small"
                    checked={state.checked}
                    indeterminate={state.indeterminate}
                    onChange={(e) => onChange(applyAccessFlagToMany(value, moduleKeys, flag, e.target.checked))}
                  />
                  {ACCESS_FLAG_LABELS[flag]}
                </Box>
              </TableCell>
            );
          })}
        </TableRow>
      </TableHead>
      <TableBody>
        {moduleKeys.map((moduleKey) => (
          <TableRow key={moduleKey} hover>
            <TableCell>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <ModuleIcon moduleKey={moduleKey} fontSize="small" color="primary" />
                <Typography variant="body2" fontWeight={600}>{MODULE_LABELS[moduleKey]}</Typography>
              </Box>
            </TableCell>
            {ACCESS_FLAGS.map((flag) => (
              <TableCell key={flag} align="center">
                <Checkbox
                  checked={Boolean(value[moduleKey]?.[flag])}
                  onChange={(e) => onChange({ ...value, [moduleKey]: applyAccessFlag(value[moduleKey], flag, e.target.checked) })}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Paper>
);

export default ModulePermissionMatrix;
