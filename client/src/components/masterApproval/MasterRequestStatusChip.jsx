import React from "react";
import { Chip } from "@mui/material";
import { MASTER_REQUEST_STATUS_CONFIG } from "../../constants/masterApproval";

const MasterRequestStatusChip = ({ status }) => {
  const config = MASTER_REQUEST_STATUS_CONFIG[status] || { label: status || "-", color: "default" };
  return <Chip size="small" label={config.label} color={config.color} variant={config.color === "default" ? "outlined" : "filled"} sx={{ fontWeight: 600 }} />;
};

export default MasterRequestStatusChip;
