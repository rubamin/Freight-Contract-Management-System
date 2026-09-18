import React from "react";
import { Grid, TextField } from "@mui/material";
import FilterPanel from "../common/FilterPanel";

// Reusable date-range filter for the dashboard. Kept separate from
// Dashboard.jsx so the filter UI can be reused/tested independently of the
// page that owns the actual query state.
const DashboardFilters = ({ open, from, to, onFromChange, onToChange, onApply, onReset }) => {
    return (
        <FilterPanel open={open} onApply={onApply} onReset={onReset}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        type="date"
                        label="From"
                        value={from || ""}
                        onChange={(e) => onFromChange(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        type="date"
                        label="To"
                        value={to || ""}
                        onChange={(e) => onToChange(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </Grid>
            </Grid>
        </FilterPanel>
    );
};

export default DashboardFilters;
