import React, { useMemo, useState } from "react";
import {
  Badge,
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import { FilterAlt, FilterAltOutlined } from "@mui/icons-material";
import ColumnFilterPopover from "./ColumnFilterPopover";
import {
  DEFAULT_REPORT_ROWS_PER_PAGE,
  NUMERIC_COLUMN_TYPES,
  REPORT_COLUMN_TYPES,
  REPORT_ROWS_PER_PAGE_OPTIONS,
  SORT_DIRECTIONS,
} from "../../constants/reports";
import { formatCell, formatMoney, formatNumber, getDistinctValues, isFilterActive, sumColumn } from "../../utils/reportData";

const HEADER_SX = { fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#F1F5F9", py: 1, borderBottom: "2px solid #E2E8F0" };
const FOOTER_SX = { fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#F8FAFC", color: "text.primary", fontSize: "0.85rem", position: "sticky", bottom: 0 };

const formatTotal = (column, rows) =>
  (column.type === REPORT_COLUMN_TYPES.MONEY ? formatMoney(sumColumn(rows, column.key)) : formatNumber(sumColumn(rows, column.key)));

// Report grid: sortable headers with a filter button each, paging, and a
// totals row for number / money columns over the filtered rows.
const ReportTable = ({ columns, rows, allRows, filters, onFilterChange, sort, onSortChange }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_REPORT_ROWS_PER_PAGE);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const hasTotals = columns.some((column) => NUMERIC_COLUMN_TYPES.includes(column.type));
  const filterOptions = useMemo(
    () => (filterColumn?.type === REPORT_COLUMN_TYPES.ENUM ? getDistinctValues(allRows, filterColumn.key) : []),
    [filterColumn, allRows]
  );

  // Back to the first page whenever the visible rows change.
  const [lastRowCount, setLastRowCount] = useState(rows.length);
  if (lastRowCount !== rows.length) {
    setLastRowCount(rows.length);
    setPage(0);
  }

  const openFilter = (event, column) => {
    event.stopPropagation();
    setFilterAnchor(event.currentTarget);
    setFilterColumn(column);
  };

  const toggleSort = (column) => {
    const isSame = sort.key === column.key;
    onSortChange({ key: column.key, direction: isSame && sort.direction === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC });
  };

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider" }} elevation={0}>
      <TableContainer sx={{ maxHeight: "calc(100vh - 360px)", minHeight: 320 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...HEADER_SX, width: 48 }}>#</TableCell>
              {columns.map((column) => {
                const active = isFilterActive(filters[column.key]);
                const isNumeric = NUMERIC_COLUMN_TYPES.includes(column.type);
                return (
                  <TableCell key={column.key} sx={HEADER_SX} align={isNumeric ? "right" : "left"}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, flexDirection: isNumeric ? "row-reverse" : "row" }}>
                      <TableSortLabel
                        active={sort.key === column.key}
                        direction={sort.key === column.key ? sort.direction : SORT_DIRECTIONS.ASC}
                        onClick={() => toggleSort(column)}
                      >
                        {column.header}
                      </TableSortLabel>
                      <Tooltip title={active ? "Filter applied - click to change" : "Filter this column"}>
                        <IconButton size="small" onClick={(event) => openFilter(event, column)} color={active ? "secondary" : "default"}>
                          <Badge variant="dot" color="secondary" invisible={!active}>
                            {active ? <FilterAlt sx={{ fontSize: 17 }} /> : <FilterAltOutlined sx={{ fontSize: 17, opacity: 0.6 }} />}
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">No rows match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : pageRows.map((row, index) => (
              <TableRow key={row.id ?? index} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#FAFBFD" } }}>
                <TableCell sx={{ color: "text.secondary" }}>{page * rowsPerPage + index + 1}</TableCell>
                {columns.map((column) => {
                  const text = formatCell(row[column.key], column.type);
                  const isNumeric = NUMERIC_COLUMN_TYPES.includes(column.type);
                  return (
                    <TableCell
                      key={column.key}
                      align={isNumeric ? "right" : "left"}
                      sx={{ whiteSpace: "nowrap", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", fontVariantNumeric: isNumeric ? "tabular-nums" : "normal" }}
                      title={text}
                    >
                      {text}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
          {hasTotals && rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell sx={FOOTER_SX}>Total</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={FOOTER_SX} align="right">
                    {NUMERIC_COLUMN_TYPES.includes(column.type) ? formatTotal(column, rows) : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(event, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={REPORT_ROWS_PER_PAGE_OPTIONS}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
      />

      <ColumnFilterPopover
        anchorEl={filterAnchor}
        column={filterColumn}
        filter={filterColumn ? filters[filterColumn.key] : null}
        options={filterOptions}
        onApply={onFilterChange}
        onClose={() => {
          setFilterAnchor(null);
          setFilterColumn(null);
        }}
      />
    </Paper>
  );
};

export default ReportTable;
