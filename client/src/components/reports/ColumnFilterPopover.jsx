import React, { useEffect, useState } from "react";
import { Autocomplete, Box, Button, Popover, Stack, TextField, Typography } from "@mui/material";
import { DATE_COLUMN_TYPES, NUMERIC_COLUMN_TYPES, REPORT_COLUMN_TYPES } from "../../constants/reports";

const EMPTY_FILTERS = {
  enum: { values: [] },
  range: { min: "", max: "" },
  dates: { from: "", to: "" },
  text: { text: "" },
};

const emptyFilterFor = (type) => {
  if (type === REPORT_COLUMN_TYPES.ENUM) return EMPTY_FILTERS.enum;
  if (NUMERIC_COLUMN_TYPES.includes(type)) return EMPTY_FILTERS.range;
  if (DATE_COLUMN_TYPES.includes(type)) return EMPTY_FILTERS.dates;
  return EMPTY_FILTERS.text;
};

const FilterFields = ({ column, draft, setDraft, options, onApply }) => {
  const set = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));
  const applyOnEnter = (e) => e.key === "Enter" && onApply();

  if (column.type === REPORT_COLUMN_TYPES.ENUM) {
    return (
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={draft.values || []}
        disableCloseOnSelect
        onChange={(e, values) => setDraft({ values })}
        renderInput={(params) => <TextField {...params} autoFocus label="Show only" placeholder="Pick values" />}
        sx={{ minWidth: 280 }}
      />
    );
  }
  if (NUMERIC_COLUMN_TYPES.includes(column.type)) {
    return (
      <Stack direction="row" spacing={1}>
        <TextField size="small" type="number" label="Min" value={draft.min ?? ""} onChange={set("min")} onKeyDown={applyOnEnter} autoFocus />
        <TextField size="small" type="number" label="Max" value={draft.max ?? ""} onChange={set("max")} onKeyDown={applyOnEnter} />
      </Stack>
    );
  }
  if (DATE_COLUMN_TYPES.includes(column.type)) {
    return (
      <Stack direction="row" spacing={1}>
        <TextField size="small" type="date" label="From" value={draft.from ?? ""} onChange={set("from")} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={draft.to ?? ""} onChange={set("to")} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
    );
  }
  return (
    <TextField
      size="small"
      autoFocus
      label="Contains"
      value={draft.text ?? ""}
      onChange={set("text")}
      onKeyDown={applyOnEnter}
      sx={{ minWidth: 260 }}
    />
  );
};

// Filter editor of one report column, opened from its header.
const ColumnFilterPopover = ({ anchorEl, column, filter, options, onApply, onClose }) => {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (column) setDraft(filter || emptyFilterFor(column.type));
  }, [column, filter]);

  if (!column) return null;

  const apply = () => {
    onApply(column.key, draft);
    onClose();
  };

  const clear = () => {
    onApply(column.key, null);
    onClose();
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      slotProps={{ paper: { sx: { borderRadius: 2, mt: 0.5 } } }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 420 }}>
        <Typography variant="subtitle2" fontWeight={700}>Filter: {column.header}</Typography>
        <FilterFields column={column} draft={draft} setDraft={setDraft} options={options} onApply={apply} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" color="inherit" onClick={clear} sx={{ textTransform: "none" }}>Clear</Button>
          <Button size="small" variant="contained" onClick={apply} sx={{ textTransform: "none" }}>Apply</Button>
        </Stack>
      </Box>
    </Popover>
  );
};

export default ColumnFilterPopover;
