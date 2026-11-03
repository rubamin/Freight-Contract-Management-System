import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Close, DeleteOutlined, Search, ViewColumn } from "@mui/icons-material";
import { CELL_INPUTS } from "../../constants/contractSheets";
import { createEmptyRow, parseColumnHeader } from "../../utils/contractSheets";

// One editable sheet of a contract: fixed columns, rate columns (which can
// be added / removed when the sheet allows it) and end columns. Works like
// the FTL Outbound rate grid of Edit Contract - type in any cell, add rows.

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const CELL_MIN_WIDTH = 100;
const FIRST_COLUMN_SX = { position: "sticky", left: 0, zIndex: 2, bgcolor: "#ffffff", borderRight: "1px solid #e0e0e0" };
const HEADER_SX = { fontWeight: "bold", bgcolor: "#f5f5f5", whiteSpace: "nowrap" };
const INPUT_PROPS = { style: { padding: "6px 8px", fontSize: "0.85rem" } };

const SheetCell = ({ column, value, destinationOptions, onChange }) => {
  if (column.input === CELL_INPUTS.READ_ONLY) {
    return <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>;
  }
  if (column.input === CELL_INPUTS.DESTINATION) {
    return (
      <Autocomplete
        freeSolo
        size="small"
        options={destinationOptions}
        value={value || ""}
        onChange={(e, option) => onChange(option || "")}
        onInputChange={(e, text, reason) => reason === "input" && onChange(text)}
        renderInput={(params) => (
          <TextField {...params} placeholder="Select or type city" />
        )}
      />
    );
  }
  return (
    <TextField
      size="small"
      fullWidth
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{ htmlInput: { ...INPUT_PROPS, inputMode: column.input === CELL_INPUTS.TEXT ? "text" : "decimal" } }}
    />
  );
};

const AddColumnDialog = ({ addColumn, existingKeys, onAdd, onClose }) => {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const column = parseColumnHeader(addColumn.kind, text);
    if (!column) {
      setError(`Not a valid header. Use ${addColumn.placeholder.replace(/^e\.g\. /, "")}.`);
      return;
    }
    if (existingKeys.has(column.key)) {
      setError(`'${column.label}' is already a column.`);
      return;
    }
    onAdd(column);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{addColumn.label}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          fullWidth
          label="Column header"
          placeholder={addColumn.placeholder}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          error={Boolean(error)}
          helperText={error || addColumn.placeholder}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd} disabled={!text.trim()}>Add Column</Button>
      </DialogActions>
    </Dialog>
  );
};

const ContractSheetTable = ({ config, sheet, destinationOptions, onChange }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [addingColumn, setAddingColumn] = useState(false);

  const { fixedColumns, endColumns, canAddRows, addRowLabel, addColumn } = config;
  const columns = [...fixedColumns, ...sheet.valueColumns, ...endColumns];
  const canRemoveColumns = Boolean(addColumn);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sheet.rows;
    return sheet.rows.filter((row) => fixedColumns.some((col) => String(row.cells[col.key] || "").toLowerCase().includes(query)));
  }, [sheet.rows, search, fixedColumns]);

  const visibleRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const updateRows = (rows) => onChange({ ...sheet, rows });

  const handleCellChange = (rowId, key, value) =>
    updateRows(sheet.rows.map((row) => (row.id === rowId ? { ...row, cells: { ...row.cells, [key]: value } } : row)));

  // New rows go on top (below the sheet's fixed rows) so they are visible straight away.
  const handleAddRow = () => {
    setSearch("");
    setPage(0);
    const fixedCount = sheet.rows.filter((row) => row.fixed).length;
    updateRows([...sheet.rows.slice(0, fixedCount), createEmptyRow(), ...sheet.rows.slice(fixedCount)]);
  };

  const handleDeleteRow = (rowId) => updateRows(sheet.rows.filter((row) => row.id !== rowId));

  const handleAddColumn = (column) => {
    onChange({ ...sheet, valueColumns: [...sheet.valueColumns, column] });
    setAddingColumn(false);
  };

  const handleRemoveColumn = (key) => {
    onChange({
      valueColumns: sheet.valueColumns.filter((col) => col.key !== key),
      rows: sheet.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(Object.entries(row.cells).filter(([cellKey]) => cellKey !== key)),
      })),
    });
  };

  const tableMinWidth = columns.reduce((sum, col) => sum + (col.minWidth || CELL_MIN_WIDTH), canAddRows ? 60 : 0);

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="body2" color="text.secondary">{config.hint}</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Find..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
            sx={{ width: 200 }}
          />
          {addColumn && (
            <Button size="small" variant="outlined" startIcon={<ViewColumn />} onClick={() => setAddingColumn(true)}>
              {addColumn.label}
            </Button>
          )}
          {canAddRows && (
            <Button size="small" variant="contained" color="secondary" startIcon={<Add />} onClick={handleAddRow}>
              {addRowLabel}
            </Button>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ border: "1px solid #e0e0e0", maxHeight: 500, boxShadow: "none" }}>
        <Table stickyHeader size="small" sx={{ minWidth: tableMinWidth }}>
          <TableHead>
            <TableRow>
              {columns.map((col, index) => {
                const removable = canRemoveColumns && sheet.valueColumns.some((valueCol) => valueCol.key === col.key);
                return (
                  <TableCell key={col.key} sx={{ ...HEADER_SX, minWidth: col.minWidth || CELL_MIN_WIDTH, ...(index === 0 ? { ...FIRST_COLUMN_SX, bgcolor: "#f5f5f5", zIndex: 3 } : {}) }}>
                    {col.label}{col.required ? " *" : ""}
                    {removable && (
                      <Tooltip title={`Remove ${col.label} and its rates`}>
                        <IconButton size="small" onClick={() => handleRemoveColumn(col.key)} sx={{ ml: 0.5 }}>
                          <Close fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                );
              })}
              {canAddRows && <TableCell sx={HEADER_SX} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((col, index) => (
                  <TableCell key={col.key} sx={{ minWidth: col.minWidth || CELL_MIN_WIDTH, ...(index === 0 ? FIRST_COLUMN_SX : {}) }}>
                    <SheetCell
                      column={row.fixed && index === 0 ? { ...col, input: CELL_INPUTS.READ_ONLY } : col}
                      value={row.cells[col.key]}
                      destinationOptions={destinationOptions}
                      onChange={(value) => handleCellChange(row.id, col.key, value)}
                    />
                  </TableCell>
                ))}
                {canAddRows && (
                  <TableCell align="center">
                    {!row.fixed && <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)} title="Delete row">
                      <DeleteOutlined fontSize="small" />
                    </IconButton>}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (canAddRows ? 1 : 0)} align="center">No matching records found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredRows.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />

      {addingColumn && (
        <AddColumnDialog
          addColumn={addColumn}
          existingKeys={new Set(sheet.valueColumns.map((col) => col.key))}
          onAdd={handleAddColumn}
          onClose={() => setAddingColumn(false)}
        />
      )}
    </Box>
  );
};

export default ContractSheetTable;
