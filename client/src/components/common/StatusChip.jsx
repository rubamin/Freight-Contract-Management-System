import React from "react";
import { Chip } from "@mui/material";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "success",
  },

  inactive: {
    label: "Inactive",
    color: "error",
  },

  approved: {
    label: "Approved",
    color: "success",
  },

  pending: {
    label: "Pending",
    color: "warning",
  },

  rejected: {
    label: "Rejected",
    color: "error",
  },

  draft: {
    label: "Draft",
    color: "default",
  },

  completed: {
    label: "Completed",
    color: "success",
  },

  cancelled: {
    label: "Cancelled",
    color: "error",
  },

  paid: {
    label: "Paid",
    color: "success",
  },

  unpaid: {
    label: "Unpaid",
    color: "warning",
  },
};

const StatusChip = ({
  status,
  label,
  size = "small",
  variant = "filled",
}) => {
  const key = String(status).toLowerCase();

  const config = STATUS_CONFIG[key] || {
    label: label || status,
    color: "default",
  };

  return (
    <Chip
      label={label || config.label}
      color={config.color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 600,
        minWidth: 90,
        borderRadius: 2,
      }}
    />
  );
};

export default StatusChip;