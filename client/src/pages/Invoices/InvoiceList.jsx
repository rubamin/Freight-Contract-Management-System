import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Chip,
  Modal,
  IconButton,
<<<<<<< HEAD
  InputAdornment,
  Link,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from "@mui/material";
import Grid from "@mui/material/Grid";
=======
  Grid,
  InputAdornment,
  Link
} from "@mui/material";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
import { 
  Close, 
  CheckCircle, 
  Error,
  Search,
  Refresh,
  Clear,
  Add,
<<<<<<< HEAD
  Description,
  Email,
  Edit,
  PendingActions
} from "@mui/icons-material";
=======
  OpenInNew,
  Description
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
<<<<<<< HEAD
import { formatDateDisplay } from "../../utils/dateFormat";
import usePermissions from "../../hooks/usePermissions";

// Modal styling for audit remarks/logs popup
=======

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const remarksModalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
  borderLeft: "6px solid #0288d1"
};

const InvoiceList = () => {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { canEdit, loaded: permissionsLoaded } = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Snackbar notification state
=======
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

<<<<<<< HEAD
  // Remarks modal state
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const [remarksModal, setRemarksModal] = useState({
    open: false,
    text: "",
    invoiceNo: ""
  });

<<<<<<< HEAD
  // Helper function to retrieve authorization headers
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const getAuthHeader = () => {
    const authDataStr = localStorage.getItem("freight_contract_auth");
    let token = localStorage.getItem("token") || "";
    if (authDataStr) {
      try {
        token = JSON.parse(authDataStr).token;
      } catch (e) {
        console.error("Token derivation failure", e);
      }
    }
    return { Authorization: `Bearer ${token}` };
  };

<<<<<<< HEAD
  // Fetch invoices from backend API
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeader();
      const response = await axios.get(
        `http://localhost:5000/api/invoices?search=${search}&page=1&pageSize=100`, 
        { headers }
      );
      const records = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setInvoices(records);
    } catch (err) {
      console.error("Error loading operational invoice tables:", err);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Failed to load invoices from server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search]);

<<<<<<< HEAD
  // Clear search filter handler
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const handleClearFilters = () => {
    setSearch("");
  };

<<<<<<< HEAD
  // Navigate to the Edit Invoice page carrying the selected invoice IDs so
  // one or many invoices can be edited together in one grid, just like the
  // Add Invoice flow.
  const handleEditSelected = () => {
    if (!Array.isArray(selectedRowIds) || selectedRowIds.length === 0) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Please select at least one invoice to edit.",
      });
      return;
    }
    navigate("/invoices/edit", { state: { invoiceIds: selectedRowIds } });
  };

  // Navigate to the Edit Invoice page for a single row via its own Edit icon.
  const handleEditSingle = (invoiceId) => {
    navigate("/invoices/edit", { state: { invoiceIds: [invoiceId] } });
  };

  // Handler to send selected invoices via email
  const handleSendEmail = async () => {
    if (!Array.isArray(selectedRowIds) || selectedRowIds.length === 0) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Please select at least one invoice to send via mail.",
      });
      return;
    }

    try {
      setLoading(true);
      const headers = getAuthHeader();
      const selectedInvoicesData = rows.filter((row) => selectedRowIds.includes(row.id));

      await axios.post(
        "http://localhost:5000/api/invoices/send-mail",
        { invoices: selectedInvoicesData },
        { headers }
      );

      setSnackbar({
        open: true,
        severity: "success",
        message: "Selected invoices data sent via email successfully!",
      });
      setSelectedRowIds([]);
    } catch (err) {
      console.error("Error sending email:", err);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Failed to send email. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Map and sanitize raw invoice records into table display rows
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const rows = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    const sortedInvoices = [...invoices].sort((a, b) => (b.InvoiceID || 0) - (a.InvoiceID || 0));

    return sortedInvoices.map((invoice, index) => {
      if (!invoice) return {};

      const expected = parseFloat(
        invoice.verification?.ExpectedAmount || 
        invoice['verification.ExpectedAmount'] || 
        invoice.ExpectedAmount ||
        0
      );
      
      const billed = parseFloat(invoice.TotalInvoiceAmount || invoice.total || 0);
      const variance = billed - expected;
      
      let systemAuditStatus = "APPROVED";
      const rawStatus = invoice.verification?.VerificationStatus || invoice['verification.VerificationStatus'] || invoice.VerificationStatus;
<<<<<<< HEAD

=======
      
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      if (rawStatus) {
        systemAuditStatus = String(rawStatus).toUpperCase();
      } else if (Math.abs(variance) > 15) {
        systemAuditStatus = "DISCREPANCY";
      }

<<<<<<< HEAD
      // IsPreApproved is now a real, persisted column (previously this flag
      // was silently discarded and always showed "No"). Pre-Approved always
      // takes priority in the displayed status over whatever the automated
      // contract-rate audit computed, so a pre-approved invoice never shows
      // as Discrepancy just because the audit ran anyway.
      const isPreApproved = Boolean(invoice.IsPreApproved ?? invoice.isPreApproved);
      const displayStatus = isPreApproved ? "PRE_APPROVED" : systemAuditStatus;

      // Safely resolve vehicle type string from object or primitive
      let vehicleTypeName = "-";
      const vType = invoice.vehicleType || invoice.VehicleType;
      if (vType) {
        if (typeof vType === "object") {
          vehicleTypeName = vType.VehicleName || vType.VehicleTypeName || vType.Name || JSON.stringify(vType);
        } else {
          vehicleTypeName = String(vType);
        }
      }

      // LocationName is now persisted directly on the invoice (backfilled
      // for existing rows), with plant.PlantName kept only as a defensive
      // fallback for any legacy invoice created before the backfill ran.
      const rawLocation = invoice.LocationName || invoice.plant?.PlantName || "-";

      const rawCustomer = 
        invoice.CustomerName || 
        invoice.customerName || 
        invoice.customer?.CustomerName || 
        "-";

      // Stored value stays untouched (YYYY-MM-DD); only the displayed
      // string is reformatted to DD/MM/YYYY via the shared date utility.
      const formattedInvoiceDate = formatDateDisplay(invoice.InvoiceDate || invoice.invoiceDate);
      const formattedLrDate = formatDateDisplay(invoice.LRDate || invoice.lrDate);

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      return {
        id: invoice.InvoiceID || index,
        srNo: index + 1,
        InvoiceID: invoice.InvoiceID,
<<<<<<< HEAD
        PlantID: invoice.PlantID ?? invoice.plantId ?? null,
        // Real hierarchy Location (N1, N2, etc.) - this is what the
        // "Send Selected Mail" flow groups by so each location's own
        // ApprovalConfig recipient gets only their location's invoices.
        // Previously missing from this row shape entirely, so every
        // selected invoice landed in one "unassigned" group and went to
        // the default notification email regardless of location.
        LocationID: invoice.LocationID ?? invoice.locationId ?? invoice.location?.LocationID ?? null,
        LocationName: rawLocation,
        UploadedDateStr: invoice.UploadedDate ? new Date(invoice.UploadedDate).toISOString().slice(0, 10) : "-",
        GSTNumber: invoice.vendorGST?.GSTNumber || invoice.gstNo || "-",
        CustomerName: rawCustomer,
        InvoiceNumber: invoice.InvoiceNumber || invoice.invoiceNo || "-",
        InvoiceDate: formattedInvoiceDate, 
        LRDate: formattedLrDate,
        LRNumber: invoice.LRNumber || invoice.lrNo || "-",
        VehicleType: vehicleTypeName,
        FromStation: invoice.FromStation || invoice.fromStation || "-",
        ToStation: invoice.ToStation || invoice.toStation || "-",
        ActualWeight: invoice.TotalWeight !== undefined ? invoice.TotalWeight : (invoice.actualWeight || 0),
        BasicFreight: invoice.BasicFreight !== undefined ? invoice.BasicFreight : (invoice.freightCharge || 0),
        DetainCharges: invoice.DetainCharges !== undefined ? invoice.DetainCharges : (invoice.detainCharge || 0), 
        ExtraCharges: invoice.ExtraCharges !== undefined ? invoice.ExtraCharges : (invoice.extraCharge || 0),   
        TotalInvoiceAmount: billed,
        ExpectedAmount: expected,
        VarianceAmount: variance,
        AuditStatus: displayStatus,
        PreAppr: isPreApproved ? "Yes" : "No",
        Remarks: invoice.Remarks || invoice.remarks || "-",
=======
        LocationName: invoice.locationName || invoice.LocationName || invoice.location?.LocationName || invoice['location.LocationName'] || "-",
        UploadedDateStr: invoice.UploadedDate ? new Date(invoice.UploadedDate).toISOString().slice(0, 10) : "-",
        GSTNumber: invoice.gstNo || invoice.vendorGST?.GSTNumber || invoice['vendorGST.GSTNumber'] || "-",
        CustomerName: invoice.customerName || invoice.CustomerName || invoice.customer?.CustomerName || invoice['customer.CustomerName'] || "-",
        InvoiceNumber: invoice.invoiceNo || invoice.InvoiceNumber || "-",
        InvoiceDate: invoice.invoiceDate || invoice.InvoiceDate || null, 
        LRDate: invoice.lrDate || invoice.LRDate || "-",
        LRNumber: invoice.lrNo || invoice.LRNumber || "-",
        VehicleNumber: invoice.vehicleNo || invoice.VehicleNumber || "-",
        VehicleType: invoice.vehicleType || invoice.VehicleType || "-",
        FromStation: invoice.fromStation || invoice.FromStation || "-",
        ToStation: invoice.toStation || invoice.ToStation || "-",
        ActualWeight: invoice.actualWeight !== undefined ? invoice.actualWeight : (invoice.TotalWeight || 0),
        BasicFreight: invoice.freightCharge !== undefined ? invoice.freightCharge : (invoice.BasicFreight || 0),
        DetainCharges: invoice.detainCharge !== undefined ? invoice.detainCharge : (invoice.DetainCharges || 0), 
        ExtraCharges: invoice.extraCharge !== undefined ? invoice.extraCharge : (invoice.ExtraCharges || 0),   
        TotalInvoiceAmount: billed,
        ExpectedAmount: expected,
        VarianceAmount: variance,
        AuditStatus: systemAuditStatus,
        PreAppr: invoice.preAppr || invoice.PreAppr || "No",
        Remarks: invoice.remarks || invoice.Remarks || "-",
        ContractID: invoice.ContractID || null,
        ContractNo: invoice.contract?.ContractNo || invoice['contract.ContractNo'] || invoice.ContractNo || (invoice.ContractID ? `CTR-${invoice.ContractID}` : "-"),
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        Doc1Path: invoice.Doc1Path || invoice.doc1Path || null,
        Doc2Path: invoice.Doc2Path || invoice.doc2Path || null,
        Doc3Path: invoice.Doc3Path || invoice.doc3Path || null,
      };
    });
  }, [invoices]);

<<<<<<< HEAD
  // Render downloadable document link inside table cell
  const renderDocCell = (docPath) => {
    if (!docPath) return "-";
=======
  const renderDocCell = (docPath) => {
    if (!docPath) return <Typography variant="body2" color="text.secondary">-</Typography>;
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    const fileName = docPath.split("\\").pop().split("/").pop();
    const fileUrl = `http://localhost:5000/${docPath.replace(/\\/g, "/")}`;

    return (
      <Link
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          textDecoration: "underline",
          color: "#0288d1",
          fontWeight: 500,
          fontSize: "0.85rem",
          "&:hover": { color: "#01579b" }
        }}
      >
        <Description fontSize="small" />
        {fileName}
      </Link>
    );
  };

<<<<<<< HEAD
  // Handle master checkbox select/deselect all
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = rows.map((n) => n.id);
      setSelectedRowIds(newSelected);
      return;
    }
    setSelectedRowIds([]);
  };

  // Handle individual row checkbox selection
  const handleClick = (id) => {
    const selectedIndex = selectedRowIds.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRowIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRowIds.slice(1));
    } else if (selectedIndex === selectedRowIds.length - 1) {
      newSelected = newSelected.concat(selectedRowIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRowIds.slice(0, selectedIndex),
        selectedRowIds.slice(selectedIndex + 1),
      );
    }
    setSelectedRowIds(newSelected);
  };

  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box p={3} sx={{ width: "100%" }}>
=======
  const columns = [
    { field: "srNo", headerName: "#", width: 60, sortable: false },
    { field: "LocationName", headerName: "Location", width: 130 },
    { field: "UploadedDateStr", headerName: "Upload Date", width: 120 },
    { field: "InvoiceNumber", headerName: "Invoice No", width: 130 },
    { 
      field: "InvoiceDate", 
      headerName: "Invoice Date", 
      width: 120,
      renderCell: (params) => {
        const rawDate = params.row?.InvoiceDate;
        if (!rawDate) return "-";
        try {
          return String(rawDate).slice(0, 10);
        } catch { return "-"; }
      }
    },
    { field: "CustomerName", headerName: "Customer Name", width: 160 },
    { field: "GSTNumber", headerName: "GST Number", width: 160 },
    { 
      field: "LRDate", 
      headerName: "LR Date", 
      width: 120, 
      renderCell: (params) => params.row?.LRDate ? String(params.row.LRDate).slice(0, 10) : "-" 
    },
    { field: "LRNumber", headerName: "LR No", width: 120 },
    { field: "VehicleNumber", headerName: "Vehicle No", width: 130 },
    { field: "VehicleType", headerName: "Vehicle Type", width: 150 },
    { field: "FromStation", headerName: "From", width: 130 }, 
    { field: "ToStation", headerName: "To", width: 130 },    
    { 
      field: "ActualWeight", 
      headerName: "Weight (MT)", 
      width: 110,
      type: "number",
      renderCell: (params) => `${params.row?.ActualWeight || 0} MT`
    },
    { 
      field: "BasicFreight", 
      headerName: "Freight Chg", 
      width: 120,
      type: "number",
      renderCell: (params) => `₹${parseFloat(params.row?.BasicFreight || 0).toFixed(2)}`
    },
    { 
      field: "DetainCharges", 
      headerName: "Detain Chg", 
      width: 110,
      type: "number",
      renderCell: (params) => `₹${parseFloat(params.row?.DetainCharges || 0).toFixed(2)}`
    },
    { 
      field: "ExtraCharges", 
      headerName: "Extra Chg", 
      width: 110,
      type: "number",
      renderCell: (params) => `₹${parseFloat(params.row?.ExtraCharges || 0).toFixed(2)}`
    },
    { 
      field: "TotalInvoiceAmount", 
      headerName: "Total Amount", 
      width: 130,
      type: "number",
      renderCell: (params) => `₹${parseFloat(params.row?.TotalInvoiceAmount || 0).toFixed(2)}`
    },
    { field: "PreAppr", headerName: "Pre-Appr", width: 90 },
    {
      field: "AuditStatus",
      headerName: "Contract Match?",
      width: 140,
      renderCell: (params) => {
        const isApproved = params.row?.AuditStatus === "APPROVED";
        return (
          <Chip
            icon={isApproved ? <CheckCircle fontSize="small" /> : <Error fontSize="small" />}
            label={isApproved ? "Yes" : "No"}
            color={isApproved ? "success" : "error"}
            variant="outlined"
            size="small"
          />
        );
      }
    },
    {
      field: "ExpectedAmount",
      headerName: "Actual Contract Price",
      width: 160,
      type: "number",
      renderCell: (params) => `₹${parseFloat(params.row?.ExpectedAmount || 0).toFixed(2)}`
    },
    {
      field: "VarianceAmount",
      headerName: "Extra Charged",
      width: 140,
      type: "number",
      renderCell: (params) => {
        const extra = parseFloat(params.row?.VarianceAmount || 0);
        if (extra <= 15) return <Typography variant="body2" color="success.main">₹0.00</Typography>;
        return (
          <Typography variant="body2" color="error.main" fontWeight={600}>
            ₹{extra.toFixed(2)}
          </Typography>
        );
      }
    },
    // Doc 1, Doc 2, Doc 3 Columns
    {
      field: "Doc1Path",
      headerName: "Doc 1",
      width: 180,
      sortable: false,
      renderCell: (params) => renderDocCell(params.row?.Doc1Path)
    },
    {
      field: "Doc2Path",
      headerName: "Doc 2",
      width: 180,
      sortable: false,
      renderCell: (params) => renderDocCell(params.row?.Doc2Path)
    },
    {
      field: "Doc3Path",
      headerName: "Doc 3",
      width: 180,
      sortable: false,
      renderCell: (params) => renderDocCell(params.row?.Doc3Path)
    },
    { 
      field: "Remarks", 
      headerName: "Remarks", 
      width: 250, 
      sortable: false,
      renderCell: (params) => {
        const val = params.value || "-";
        return (
          <Typography
            variant="body2"
            sx={{
              color: "#0288d1",
              cursor: "pointer",
              textDecoration: "underline",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 500,
              "&:hover": { color: "#01579b" }
            }}
            onClick={() => setRemarksModal({
              open: true,
              text: val,
              invoiceNo: params.row?.InvoiceNumber || "N/A"
            })}
          >
            {val}
          </Typography>
        );
      }
    }
  ];

  return (
    <Box p={3} sx={{ maxWidth: "900px", margin: "0 auto", width: "100%", overflow: "hidden" }}>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <PageHeader
          title="Invoices Management & Auditing"
          breadcrumbs={[
<<<<<<< HEAD
            { label: "Dashboard", path: "/dashboard" },
            { label: "Invoices Summary" },
          ]}
        />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {/* Bug fix (task item 17): hidden, not just disabled, without
              Invoices Edit permission. */}
          {permissionsLoaded && canEdit("invoices") && (
            <Button 
              variant="contained" 
              color="secondary" 
              startIcon={<Edit />} 
              onClick={handleEditSelected}
              disabled={selectedRowIds.length === 0}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Edit Selected ({selectedRowIds.length})
            </Button>
          )}
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<Email />} 
            onClick={handleSendEmail}
            disabled={selectedRowIds.length === 0}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Send Selected Mail ({selectedRowIds.length})
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />} 
            onClick={() => navigate("/Invoices/add")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Add Invoice
          </Button>
        </Box>
=======
            { label: "Dashboard", path: "/vendors" },
            { label: "Invoices Summary" },
          ]}
        />
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />} 
          onClick={() => navigate("/Invoices/add")}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Add Invoice
        </Button>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
<<<<<<< HEAD
          <Grid size={{ xs: 12, md: 6 }}>
=======
          <Grid item xs={12} md={6}>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            <TextField
              fullWidth
              size="small"
              placeholder="Search Invoice Number, LR, or Vehicle details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }
              }}
            />
          </Grid>
<<<<<<< HEAD
          <Grid size={{ xs: 12, md: 6 }}>
=======
          <Grid item xs={12} md={6}>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={fetchInvoices}>
                Refresh
              </Button>
              <Button variant="outlined" size="small" startIcon={<Clear />} onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: 2, borderRadius: 2 }}>
<<<<<<< HEAD
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="invoices table">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f1f5f9" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selectedRowIds.length > 0 && selectedRowIds.length < rows.length}
                    checked={rows.length > 0 && selectedRowIds.length === rows.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>#</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Location</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Upload Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Invoice No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Invoice Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>GST Number</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>LR Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>LR No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Vehicle Type</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>From</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>To</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Weight (MT)</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Freight Chg</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Detain Chg</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Extra Chg</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Pre-Appr</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actual Contract Price</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Extra Charged</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Doc 1</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Doc 2</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Doc 3</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Remarks</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={27} align="center" sx={{ py: 3 }}>
                    <Typography>Loading Invoices...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={27} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No Invoices Found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => {
                  const isItemSelected = selectedRowIds.includes(row.id);
                  const extra = parseFloat(row.VarianceAmount || 0);

                  // Tri-state status chip: Pre-Approved always takes
                  // priority, then the genuine contract-match audit outcome.
                  const statusConfig = {
                    PRE_APPROVED: { label: "Pre-Approved", color: "info", icon: <PendingActions fontSize="small" /> },
                    APPROVED: { label: "Approved", color: "success", icon: <CheckCircle fontSize="small" /> },
                    DISCREPANCY: { label: "Discrepancy", color: "error", icon: <Error fontSize="small" /> },
                  };
                  const currentStatus = statusConfig[row.AuditStatus] || statusConfig.DISCREPANCY;

                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onChange={() => handleClick(row.id)}
                        />
                      </TableCell>
                      <TableCell>{row.srNo}</TableCell>
                      <TableCell>{row.LocationName}</TableCell>
                      <TableCell>{row.UploadedDateStr}</TableCell>
                      <TableCell>{row.InvoiceNumber}</TableCell>
                      <TableCell>{row.InvoiceDate}</TableCell>
                      <TableCell>{row.CustomerName}</TableCell>
                      <TableCell>{row.GSTNumber}</TableCell>
                      <TableCell>{row.LRDate}</TableCell>
                      <TableCell>{row.LRNumber}</TableCell>
                      <TableCell>{row.VehicleType}</TableCell>
                      <TableCell>{row.LocationName}</TableCell>
                      <TableCell>{row.ToStation}</TableCell>
                      <TableCell>{row.ActualWeight} MT</TableCell>
                      <TableCell>₹{parseFloat(row.BasicFreight).toFixed(2)}</TableCell>
                      <TableCell>₹{parseFloat(row.DetainCharges).toFixed(2)}</TableCell>
                      <TableCell>₹{parseFloat(row.ExtraCharges).toFixed(2)}</TableCell>
                      <TableCell>₹{parseFloat(row.TotalInvoiceAmount).toFixed(2)}</TableCell>
                      <TableCell>{row.PreAppr}</TableCell>
                      <TableCell>
                        <Chip
                          icon={currentStatus.icon}
                          label={currentStatus.label}
                          color={currentStatus.color}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>₹{parseFloat(row.ExpectedAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        {extra <= 15 ? (
                          <Typography variant="body2" color="success.main">₹0.00</Typography>
                        ) : (
                          <Typography variant="body2" color="error.main" fontWeight={600}>
                            ₹{extra.toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{renderDocCell(row.Doc1Path)}</TableCell>
                      <TableCell>{renderDocCell(row.Doc2Path)}</TableCell>
                      <TableCell>{renderDocCell(row.Doc3Path)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#0288d1",
                            cursor: "pointer",
                            textDecoration: "underline",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 200,
                            fontWeight: 500,
                            "&:hover": { color: "#01579b" }
                          }}
                          onClick={() => setRemarksModal({
                            open: true,
                            text: row.Remarks,
                            invoiceNo: row.InvoiceNumber || "N/A"
                          })}
                        >
                          {row.Remarks}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {permissionsLoaded && canEdit("invoices") && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditSingle(row.InvoiceID)}
                            title="Edit Invoice"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

=======
        <Box sx={{ width: "100%", height: 600 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ 
              pagination: { paginationModel: { page: 0, pageSize: 25 } } 
            }}
            localeText={{
              noRowsLabel: "No Invoices Found",
            }}
            sx={{
              width: "100%",
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "auto !important"
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f1f5f9",
                fontWeight: "bold",
              }
            }}
          />
        </Box>
      </Paper>

      {/* Remarks Modal */}
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      <Modal open={remarksModal.open} onClose={() => setRemarksModal({ ...remarksModal, open: false })}>
        <Box sx={remarksModalStyle}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={600} color="primary">
              Audit Logs (Invoice: {remarksModal.invoiceNo})
            </Typography>
            <IconButton onClick={() => setRemarksModal({ ...remarksModal, open: false })}>
              <Close />
            </IconButton>
          </Box>
          <Paper sx={{ p: 2, bgcolor: "#fafafa", border: "1px solid #e0e0e0", maxHeight: 300, overflowY: "auto" }}>
            <Typography variant="body1" sx={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "#37474f" }}>
              {remarksModal.text}
            </Typography>
          </Paper>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button variant="contained" onClick={() => setRemarksModal({ ...remarksModal, open: false })}>
              Close Analysis
            </Button>
          </Box>
        </Box>
      </Modal>

      <LoadingOverlay open={loading} message="Loading Invoices..." />
      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Box>
  );
};

export default InvoiceList;