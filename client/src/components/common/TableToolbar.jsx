import React from "react";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";

import {
  RefreshRounded,
  FileDownloadOutlined,
  FilterListRounded,
  AddRounded,
} from "@mui/icons-material";

import PrimaryButton from "./PrimaryButton";

const TableToolbar = ({
  title,
  totalRecords,
  addButtonText,
  addButtonIcon = <AddRounded />,
  onAdd,
  onRefresh,
  onExport,
  onFilter,
  rightContent,
}) => {
  return (
    <Box
      sx={{
        mb: 2,
        p: 2.5,
        bgcolor: "#FFFFFF",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        boxShadow: "0 4px 18px rgba(15,23,42,.05)",
      }}
    >
      {/* Left Section: Title and Total Count */}
      <Box>
        {title && (
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
        )}

        {totalRecords !== undefined && (
          <Typography variant="body2" color="text.secondary">
            {totalRecords.toLocaleString()} Records
          </Typography>
        )}
      </Box>

      {/* Right Section: Action Icons & Controls */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        {rightContent}

        {/* Refresh Action Trigger */}
        {onRefresh && (
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} aria-label="refresh data">
              <RefreshRounded />
            </IconButton>
          </Tooltip>
        )}

        {/* Filter Panel Toggle Trigger */}
        {onFilter && (
          <Tooltip title="Filters">
            <IconButton onClick={onFilter} aria-label="toggle filters">
              <FilterListRounded />
            </IconButton>
          </Tooltip>
        )}

        {/* Export Data Action Trigger */}
        {onExport && (
          <Tooltip title="Export">
            <IconButton onClick={onExport} aria-label="export data">
              <FileDownloadOutlined />
            </IconButton>
          </Tooltip>
        )}

        {/* Add Record Primary Action Trigger */}
        {onAdd && (
          <>
            <Divider orientation="vertical" flexItem />

            <PrimaryButton startIcon={addButtonIcon} onClick={onAdd}>
              {addButtonText}
            </PrimaryButton>
          </>
        )}
      </Box>
    </Box>
  );
};

export default TableToolbar;