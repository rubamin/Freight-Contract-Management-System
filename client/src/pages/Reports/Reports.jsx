import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  InputAdornment,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Search,
  FileDownload,
  ViewColumn,
  FilterAltOff,
  Refresh,
  Receipt,
  LocalShipping,
  People,
  Place,
  Scale,
  DirectionsCar,
  Groups,
  ManageAccounts,
  PendingActions,
  Assessment,
} from "@mui/icons-material";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import SummaryCard from "../../components/common/SummaryCard";
import EmptyState from "../../components/common/EmptyState";
import ReportTable from "../../components/reports/ReportTable";
import { getReportCatalog, getReportData } from "../../services/reportsService";
import { SORT_DIRECTIONS } from "../../constants/reports";
import {
  computeCardValue,
  describeFilter,
  exportRowsToExcel,
  filterRows,
  formatNumber,
  isFilterActive,
  sortRows,
} from "../../utils/reportData";
import { formatDateTimeDisplay } from "../../utils/dateFormat";

// Icons of the report keys in server/constants/reportDefinitions.js.
const REPORT_ICONS = {
  invoices: Receipt,
  contracts: LocalShipping,
  vendors: People,
  destinations: Place,
  weights: Scale,
  "vehicle-types": DirectionsCar,
  customers: Groups,
  users: ManageAccounts,
  "master-requests": PendingActions,
};

const NO_SORT = { key: null, direction: SORT_DIRECTIONS.ASC };
const CARD_SKELETON_COUNT = 4;

const ReportPicker = ({ catalog, selectedKey, onSelect }) => (
  <Box sx={{ display: "grid", gap: 1.5, mb: 3, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" } }}>
    {catalog.map((report) => {
      const Icon = REPORT_ICONS[report.key] || Assessment;
      const selected = report.key === selectedKey;
      return (
        <Paper
          key={report.key}
          elevation={0}
          onClick={() => onSelect(report.key)}
          title={report.description}
          sx={{
            p: 1.5,
            borderRadius: 3,
            cursor: "pointer",
            border: "1px solid",
            borderColor: selected ? "secondary.main" : "divider",
            bgcolor: selected ? "secondary.main" : "background.paper",
            color: selected ? "#fff" : "text.primary",
            display: "flex",
            alignItems: "center",
            gap: 1,
            transition: "all .2s",
            "&:hover": { borderColor: "secondary.main", boxShadow: "0 4px 14px rgba(37,99,235,0.15)" },
          }}
        >
          <Icon fontSize="small" sx={{ color: selected ? "#fff" : "secondary.main" }} />
          <Typography variant="body2" sx={{ color: selected ? "#fff" : "secondary.primary" }} fontWeight={700} noWrap>{report.label}</Typography>
        </Paper>
      );
    })}
  </Box>
);

const ColumnChooser = ({ columns, hiddenKeys, onToggle, onShowAll }) => {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Button variant="outlined" size="small" startIcon={<ViewColumn />} onClick={(e) => setAnchor(e.currentTarget)} sx={{ textTransform: "none", height: 40 }}>
        Columns ({columns.length - hiddenKeys.length}/{columns.length})
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 420 } } }}>
        <MenuItem onClick={onShowAll} dense>
          <ListItemText primary="Show all columns" slotProps={{ primary: { fontWeight: 700 } }} />
        </MenuItem>
        {columns.map((column) => (
          <MenuItem key={column.key} dense onClick={() => onToggle(column.key)}>
            <Checkbox size="small" checked={!hiddenKeys.includes(column.key)} sx={{ p: 0.5, mr: 1 }} />
            <ListItemText primary={column.header} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// One report at a time: summary cards and totals follow every column
// filter and the search, and Excel exports exactly what is shown.
export default function Reports() {
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(NO_SORT);
  const [hiddenKeys, setHiddenKeys] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });

  const notify = (message, severity = "error") => setSnackbar({ open: true, message, severity });

  useEffect(() => {
    getReportCatalog()
      .then((list) => {
        setCatalog(list || []);
        if (list?.length) setSelectedKey(list[0].key);
      })
      .catch((error) => notify(error?.response?.data?.message || "Failed to load the reports."))
      .finally(() => setCatalogLoading(false));
  }, []);

  const loadReport = (reportKey) => {
    setReportLoading(true);
    getReportData(reportKey)
      .then(setReport)
      .catch((error) => {
        setReport(null);
        notify(error?.response?.data?.message || "Failed to load the report.");
      })
      .finally(() => setReportLoading(false));
  };

  useEffect(() => {
    if (!selectedKey) return;
    setFilters({});
    setSearch("");
    setSort(NO_SORT);
    setHiddenKeys([]);
    loadReport(selectedKey);
  }, [selectedKey]);

  const allColumns = useMemo(() => report?.columns || [], [report]);
  const allRows = useMemo(() => report?.rows || [], [report]);
  const visibleColumns = allColumns.filter((column) => !hiddenKeys.includes(column.key));

  const filteredRows = useMemo(() => filterRows(allRows, allColumns, filters, search), [allRows, allColumns, filters, search]);
  const sortedRows = useMemo(
    () => sortRows(filteredRows, allColumns.find((column) => column.key === sort.key), sort.direction),
    [filteredRows, allColumns, sort]
  );

  const activeFilters = allColumns.filter((column) => isFilterActive(filters[column.key]));
  const isFiltered = activeFilters.length > 0 || Boolean(search.trim());

  const handleFilterChange = (key, value) =>
    setFilters((prev) => {
      const next = { ...prev };
      if (isFilterActive(value)) next[key] = value;
      else delete next[key];
      return next;
    });

  const clearAll = () => {
    setFilters({});
    setSearch("");
  };

  const toggleColumn = (key) =>
    setHiddenKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));

  const handleExport = () => {
    exportRowsToExcel({
      fileName: `${report.key}-report-${Date.now()}.xlsx`,
      sheetName: report.label,
      columns: visibleColumns,
      rows: sortedRows,
    });
  };

  const showSkeleton = reportLoading || !report;

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Pick a report and filter any column - the cards and totals update instantly. Export exactly what you see to Excel."
        breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Reports" }]}
      />

      {catalogLoading ? (
        <Skeleton variant="rounded" height={56} sx={{ mb: 3 }} />
      ) : catalog.length ? (
        <ReportPicker catalog={catalog} selectedKey={selectedKey} onSelect={setSelectedKey} />
      ) : (
        <EmptyState title="No reports available" description="You do not have View access to any module that has a report. Ask your admin for access." />
      )}

      {selectedKey && (
        <>
          <Box sx={{ display: "grid", gap: 2, mb: 2.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" } }}>
            {showSkeleton
              ? Array.from({ length: CARD_SKELETON_COUNT }, (_, index) => <Skeleton key={index} variant="rounded" height={78} />)
              : report.cards.map((card) => (
                  <SummaryCard
                    key={card.label}
                    label={card.label}
                    value={computeCardValue(card, filteredRows)}
                    caption={isFiltered ? "Filtered rows" : "All rows"}
                    color={card.color}
                  />
                ))}
          </Box>

          <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Search all columns"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ minWidth: 260 }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
                />
                <Typography variant="body2" color="text.secondary">
                  Showing <strong>{formatNumber(filteredRows.length, 0)}</strong> of {formatNumber(allRows.length, 0)} rows
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                <Button size="small" startIcon={<FilterAltOff />} disabled={!isFiltered} onClick={clearAll} sx={{ textTransform: "none", height: 40 }}>
                  Clear filters
                </Button>
                <ColumnChooser columns={allColumns} hiddenKeys={hiddenKeys} onToggle={toggleColumn} onShowAll={() => setHiddenKeys([])} />
                <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={() => loadReport(selectedKey)} disabled={reportLoading} sx={{ textTransform: "none", height: 40 }}>
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<FileDownload />}
                  disabled={!report || !sortedRows.length || !visibleColumns.length}
                  onClick={handleExport}
                  sx={{ textTransform: "none", fontWeight: 600, height: 40 }}
                >
                  Export Excel ({formatNumber(sortedRows.length, 0)})
                </Button>
              </Stack>
            </Stack>

            {activeFilters.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 1 }}>
                {activeFilters.map((column) => (
                  <Chip
                    key={column.key}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    label={`${column.header}: ${describeFilter(column, filters[column.key])}`}
                    onDelete={() => handleFilterChange(column.key, null)}
                  />
                ))}
              </Stack>
            )}
          </Paper>

          {report?.truncated && (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              Only the latest {formatNumber(report.maxRows, 0)} rows are loaded for this report.
            </Alert>
          )}

          {showSkeleton ? (
            <Skeleton variant="rounded" height={420} />
          ) : (
            <>
              <ReportTable
                columns={visibleColumns}
                rows={sortedRows}
                allRows={allRows}
                filters={filters}
                onFilterChange={handleFilterChange}
                sort={sort}
                onSortChange={setSort}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "right" }}>
                Generated {formatDateTimeDisplay(report.generatedAt)}
              </Typography>
            </>
          )}
        </>
      )}

      <AppSnackbar open={snackbar.open} severity={snackbar.severity} message={snackbar.message} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />
    </Box>
  );
}
