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
  Grid,
  InputAdornment,
  Link
} from "@mui/material";
import { 
  Close, 
  CheckCircle, 
  Error,
  Search,
  Refresh,
  Clear,
  Add,
  OpenInNew,
  Description
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";

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
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const [remarksModal, setRemarksModal] = useState({
    open: false,
    text: "",
    invoiceNo: ""
  });

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

  const handleClearFilters = () => {
    setSearch("");
  };

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
      
      if (rawStatus) {
        systemAuditStatus = String(rawStatus).toUpperCase();
      } else if (Math.abs(variance) > 15) {
        systemAuditStatus = "DISCREPANCY";
      }

      return {
        id: invoice.InvoiceID || index,
        srNo: index + 1,
        InvoiceID: invoice.InvoiceID,
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
        Doc1Path: invoice.Doc1Path || invoice.doc1Path || null,
        Doc2Path: invoice.Doc2Path || invoice.doc2Path || null,
        Doc3Path: invoice.Doc3Path || invoice.doc3Path || null,
      };
    });
  }, [invoices]);

  const renderDocCell = (docPath) => {
    if (!docPath) return <Typography variant="body2" color="text.secondary">-</Typography>;
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
      <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <PageHeader
          title="Invoices Management & Auditing"
          breadcrumbs={[
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
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={6}>
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