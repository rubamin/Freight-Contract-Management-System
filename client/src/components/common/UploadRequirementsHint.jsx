import React from "react";
import { Typography } from "@mui/material";

// Shown under every upload field: which file types it takes and the size limit.
const UploadRequirementsHint = ({ rule, sx }) => (
  <Typography
    variant="caption"
    component="div"
    sx={{ color: "text.secondary", fontSize: "0.68rem", lineHeight: 1.3, ...sx }}
  >
    Allowed: {rule.label} (max {rule.maxSizeMB} MB{rule.maxTotalSizeMB ? `, ${rule.maxTotalSizeMB} MB per invoice` : ""})
  </Typography>
);

export default UploadRequirementsHint;
