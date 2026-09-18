import React from "react";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import { Search, Refresh, FilterList } from "@mui/icons-material";

const SearchPanel = ({ value, onChange, placeholder, onRefresh, onFilter }) => {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, width: "100%", alignItems: "center" }}>
      <TextField
        fullWidth
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={onChange}
        size="small"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ background: "#fff", borderRadius: 2 }}
      />

      {onRefresh && (
        <IconButton onClick={onRefresh} color="primary" sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
          <Refresh />
        </IconButton>
      )}

      {onFilter && (
        <IconButton onClick={onFilter} color="primary" sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
          <FilterList />
        </IconButton>
      )}
    </Box>
  );
};

export default SearchPanel;