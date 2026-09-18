import React from "react";
import {
  Paper,
  Box,
  Collapse,
} from "@mui/material";

import PrimaryButton from "./PrimaryButton";

const FilterPanel = ({
  open = false,
  children,
  onApply,
  onReset,
  applyText = "Apply Filters",
  resetText = "Reset",
}) => {
  return (
    <Collapse in={open}>
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          mb: 3,
          p: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 4px 18px rgba(15,23,42,.05)",
        }}
      >
        {/* Filter inputs/content container */}
        {children}

        {/* Action Buttons Footer Container */}
        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          {/* Reset Filters Trigger */}
          <PrimaryButton
            variant="outlined"
            color="inherit"
            onClick={onReset}
          >
            {resetText}
          </PrimaryButton>

          {/* Apply Filters Trigger */}
          <PrimaryButton onClick={onApply}>
            {applyText}
          </PrimaryButton>
        </Box>
      </Paper>
    </Collapse>
  );
};

export default FilterPanel;