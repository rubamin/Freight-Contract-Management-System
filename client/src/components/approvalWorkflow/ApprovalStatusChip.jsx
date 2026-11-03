import React from "react";
import { Chip } from "@mui/material";
import { getApprovalStatusConfig } from "../../constants/approvalWorkflow";

// Approval Status of an invoice; `stepName` is shown while it is pending.
const ApprovalStatusChip = ({ status, stepName, onClick }) => {
  const config = getApprovalStatusConfig(status);
  const label = stepName && status === "PENDING_APPROVAL" ? `${config.label} (${stepName})` : config.label;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={config.color}
      label={label}
      onClick={onClick}
      sx={onClick ? { cursor: "pointer" } : undefined}
    />
  );
};

export default ApprovalStatusChip;
