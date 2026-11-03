import React from "react";
import { Chip, Stack } from "@mui/material";
import { MASTER_ACTION_CONFIG, MASTER_REQUEST_OPERATIONS } from "../../constants/masterApproval";

// Add / Edit, plus "Bulk" for an Excel bulk upload.
const MasterActionChip = ({ actionType, operation }) => {
  const config = MASTER_ACTION_CONFIG[actionType] || { label: actionType, color: "default" };
  return (
    <Stack direction="row" spacing={0.5}>
      <Chip size="small" label={config.label} color={config.color} variant="outlined" sx={{ fontWeight: 600 }} />
      {operation === MASTER_REQUEST_OPERATIONS.BULK && <Chip size="small" label="Bulk" variant="outlined" />}
    </Stack>
  );
};

export default MasterActionChip;
