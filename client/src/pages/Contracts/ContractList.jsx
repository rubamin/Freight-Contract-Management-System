import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from "@mui/material";
import {
  Add,
  Clear,
  Delete,
  Download,
  Edit,
  FileDownload,
  Refresh,
  Visibility,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import DeleteDialog from "../../components/common/DeleteDialog";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import AppSnackbar from "../../components/common/AppSnackbar";
import FilterPanel from "../../components/common/FilterPanel";
import CustomDataGrid from "../../components/common/CustomDataGrid";
import TableToolbar from "../../components/common/TableToolbar";
import useDebounce from "../../hooks/useDebounce";

import {
  clearContractError,
  fetchContracts,
  fetchContractVendors,
  removeContract,
} from "../../redux/slices/contractSlice";
import { getContractDownloadUrl } from "../../redux/api/contractAPI";

// Status color mapping for contract badges
const statusColors = {
  DRAFT: "default",
  ACTIVE: "success",
  EXPIRED: "warning",
  CANCELLED: "error",
};

const statusOptions = ["Draft", "Active", "Expired", "Cancelled"];

// Utility helper to format date strings
const formatDate = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

// Utility helper to construct Excel export values safely
const buildExportValue = (value) => {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
};

const ContractList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    contracts,
    vendors,
    totalRecords,
    loading,
    deleting,
    error,
  } = useSelector((state) => state.contract);

  // Filter and search tracking states
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [filters, setFilters] = useState({
    vendorIds: [],
    status: "",
    validFrom: "",
    validTo: "",
  });

  // Pagination and sorting states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortModel, setSortModel] = useState([
    {
      field: "ContractID",
      sort: "desc",
    },
  ]);

  // Dialog and feedback states
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  // Format contract rows for DataGrid display
  const rows = useMemo(
    () =>
      contracts.map((contract) => ({
        ...contract,
        VendorName: contract.vendor?.VendorName || "-",
        ValidityFrom: formatDate(contract.ContractStartDate),
        ValidityTo: formatDate(contract.ContractEndDate),
        CreatedDate: formatDate(contract.CreatedAt),
      })),
    [contracts]
  );

  // Load paginated and filtered contracts from backend API
  const loadContracts = () => {
    dispatch(
      fetchContracts({
        page: page + 1,
        pageSize,
        search: debouncedSearch,
        vendorId: filters.vendorIds.join(","),
        status: filters.status,
        validFrom: filters.validFrom,
        validTo: filters.validTo,
        sortField: sortModel[0]?.field || "ContractID",
        sortOrder: sortModel[0]?.sort?.toUpperCase() || "DESC",
      })
    );
  };

  // Fetch vendors on mount
  useEffect(() => {
    dispatch(fetchContractVendors());
  }, [dispatch]);

  // Reload contracts on state or filter changes
  useEffect(() => {
    loadContracts();
  }, [page, pageSize, debouncedSearch, filters, sortModel]);

  // Handle standard filter value changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    queueMicrotask(() => {
      setPage(0);
      setFilters((prev) => ({ ...prev, [name]: value }));
    });
  };

  // Handle multi-select vendor filter changes
  const handleVendorMultiSelectChange = (event) => {
    const { value } = event.target;
    queueMicrotask(() => {
      setPage(0);
      setFilters((prev) => ({
        ...prev,
        vendorIds: typeof value === "string" ? value.split(",") : value,
      }));
    });
  };

  // Clear all active filters and search queries
  const handleClearFilters = () => {
    queueMicrotask(() => {
      setSearch("");
      setPage(0);
      setFilters({ vendorIds: [], status: "", validFrom: "", validTo: "" });
    });
  };

  // Confirm and process contract deletion
  const handleDeleteConfirm = async () => {
    const result = await dispatch(removeContract(selectedContractId));
    if (removeContract.fulfilled.match(result)) {
      setSnackbar({
        open: true,
        severity: "success",
        message: "Contract deleted successfully.",
      });
      setDeleteDialog(false);
      loadContracts();
      return;
    }
    setSnackbar({
      open: true,
      severity: "error",
      message: result.payload || "Failed to delete contract.",
    });
  };

  // Handle file download for PDF or Rate Matrix Excel
  const handleDownload = ({ id, type }) => {
    window.open(getContractDownloadUrl({ id, type }), "_blank", "noopener");
  };

  // Handle data export to Excel spreadsheet
  const handleExport = () => {
    const headers = [
      "Contract Number", "Vendor Name", "PAN Number", "Validity From",
      "Validity To", "Diesel Base Price", "Diesel Revision", "Status", "Created Date",
    ];

    const lines = rows.map((row) =>
      [
        row.ContractNo, row.VendorName, row.VendorPAN, row.ValidityFrom,
        row.ValidityTo, row.DieselBasePrice, row.DieselRevision, row.Status, row.CreatedDate,
      ]
        .map(buildExportValue)
        .join(",")
    );

    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contracts.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  // DataGrid table columns configuration
  const columns = [
    { field: "ContractNo", headerName: "Contract Number", width: 140 },
    { field: "VendorName", headerName: "Vendor Name", width: 160 },
    { field: "VendorPAN", headerName: "PAN Number", width: 120 },
    { field: "ValidityFrom", headerName: "Validity From", width: 120 },
    { field: "ValidityTo", headerName: "Validity To", width: 120 },
    { field: "DieselBasePrice", headerName: "Diesel Base", width: 110 },
    { field: "DieselRevision", headerName: "Diesel Rev.", width: 120 },
    {
      field: "Status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => {
        const status = String(params.value || "Draft").toUpperCase();
        return (
          <Chip label={params.value || "Draft"} color={statusColors[status] || "default"} size="small" />
        );
      },
    },
    { field: "CreatedDate", headerName: "Created Date", width: 120 },
    {
      field: "Action",
      headerName: "Actions",
      width: 290,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Tooltip title="View Contract">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/contracts/view/${params.row.ContractID}`)}
              aria-label="view contract"
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit Contract">
            <IconButton
              size="small"
              color="warning"
              onClick={() => navigate(`/contracts/edit/${params.row.ContractID}`)}
              aria-label="edit contract"
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download Contract PDF">
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={!params.row.ContractPdfFileName}
                onClick={() => handleDownload({ id: params.row.ContractID, type: "pdf" })}
                aria-label="download contract pdf"
              >
                <Download fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Download Rate Matrix Excel">
            <span>
              <IconButton
                size="small"
                color="success"
                disabled={!params.row.RateMatrixFileName}
                onClick={() => handleDownload({ id: params.row.ContractID, type: "rate-matrix" })}
                aria-label="download rate matrix excel"
              >
                <FileDownload fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setSelectedContractId(params.row.ContractID);
                setDeleteDialog(true);
              }}
              aria-label="delete contract"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", margin: "0 auto", width: "1000px", overflowX: "hidden" }}>
      {/* Page Header Component */}
      <PageHeader
        title="Contract Master"
        breadcrumbs={[
          { label: "Dashboard", path: "/vendors" },
          { label: "Contract Master" },
        ]}
        buttonText="Create Contract"
        buttonIcon={<Add />}
        onButtonClick={() => navigate("/contracts/add")}
      />

      {/* Reusable Search & Filter Panel */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: "250px" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search Contract, Vendor..."
              value={search}
              onChange={(e) => {
                queueMicrotask(() => {
                  setPage(0);
                  setSearch(e.target.value);
                });
              }}
            />
          </Box>
          <Button
            variant="outlined"
            onClick={() => setShowFilters((prev) => !prev)}
            startIcon={<Refresh />}
          >
            {showFilters ? "Hide Filters" : "Advanced Filters"}
          </Button>
        </Box>

        {/* Expandable Advanced Filter Panel */}
        <FilterPanel
          open={showFilters}
          onApply={loadContracts}
          onReset={handleClearFilters}
          applyText="Apply"
          resetText="Clear"
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
            {/* Vendor Multi-Select */}
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 16px)" } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Vendors</InputLabel>
                <Select
                  multiple
                  label="Vendors"
                  name="vendorIds"
                  value={filters.vendorIds}
                  onChange={handleVendorMultiSelectChange}
                  input={<OutlinedInput label="Vendors" size="small" />}
                  renderValue={(selected) =>
                    selected
                      .map((id) => vendors.find((v) => String(v.VendorID) === String(id))?.VendorName || id)
                      .join(", ")
                  }
                >
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor.VendorID} value={vendor.VendorID}>
                      <Checkbox checked={filters.vendorIds.indexOf(vendor.VendorID) > -1} size="small" />
                      <ListItemText primary={vendor.VendorName} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Status Select */}
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 16px)" } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select label="Status" name="status" value={filters.status} onChange={handleFilterChange}>
                  <MenuItem value="">All</MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Validity From Date */}
            <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 16px)" } }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Validity From"
                name="validFrom"
                value={filters.validFrom}
                onChange={handleFilterChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>
        </FilterPanel>
      </Paper>

      {/* Table Toolbar Component */}
      <TableToolbar
        title="Contract List"
        totalRecords={totalRecords}
        onRefresh={loadContracts}
        onExport={handleExport}
      />

      {/* Reusable Custom Data Grid Component */}
      <Paper sx={{ width: "100%", overflowX: "auto" }}>
        <Box sx={{ minWidth: "1400px" }}>
          <CustomDataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.ContractID}
            loading={loading}
            totalRecords={totalRecords}
            page={page}
            pageSize={pageSize}
            onPaginationModelChange={(model) => {
              queueMicrotask(() => {
                setPage(model.page);
                setPageSize(model.pageSize);
              });
            }}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              queueMicrotask(() => {
                setSortModel(model);
              });
            }}
          />
        </Box>
      </Paper>

      {/* Delete Confirmation Popup Dialog */}
      <DeleteDialog
        open={deleteDialog}
        loading={deleting}
        title="Delete Contract"
        message="Are you sure you want to delete this contract?"
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Global Transparent Loader Overlay */}
      <LoadingOverlay open={loading} message="Loading Contracts..." />

      {/* Application Feedback Snackbar */}
      <AppSnackbar
        open={snackbar.open || Boolean(error)}
        severity={snackbar.open ? snackbar.severity : "error"}
        message={snackbar.open ? snackbar.message : error}
        onClose={() => {
          setSnackbar({ ...snackbar, open: false });
          dispatch(clearContractError());
        }}
      />
    </Box>
  );
};

export default ContractList;