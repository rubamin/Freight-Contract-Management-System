import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from "@mui/material";
import { CloudUpload, Save, Search, Add } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";


import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  editContract,
  fetchContractById,
  fetchContractVendors,
} from "../../redux/slices/contractSlice";


const initialFormData = {
  VendorID: "",
  VendorPAN: "",
  ContractNumber: "",
  ValidFrom: "",
  ValidTo: "",
  Remarks: "",
  Status: "Draft",
};

// Normalized matching status options to prevent out-of-range mismatch warnings

const contractStatuses = [
  { label: "Draft", value: "Draft" },
  { label: "Active", value: "Active" },
  { label: "Expired", value: "Expired" },
  { label: "Cancelled", value: "Cancelled" },
];

const formatDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const buildFormDataFromContract = (contract) => {
  const rawStatus = contract?.Status || contract?.status || "Draft";
  // Normalize status casing to match select options safely

  const normalizedStatus = contractStatuses.find(
    (s) => s.value.toLowerCase() === String(rawStatus).toLowerCase()
  )?.value || "Draft";

  return {
    VendorID: contract?.VendorID || contract?.vendorID || "",
    VendorPAN: contract?.VendorPAN || contract?.vendor?.PANNo || contract?.vendorPan || "",
    ContractNumber: contract?.ContractNo || contract?.contractNo || "",
    ValidFrom: formatDate(contract?.ContractStartDate || contract?.contractStartDate),
    ValidTo: formatDate(contract?.ContractEndDate || contract?.contractEndDate),

    Remarks: contract?.Remarks || contract?.remarks || "",
    Status: normalizedStatus,
  };
};

const EditContract = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { vendors, contract, loading, saving } = useSelector((state) => state.contract);

  const [formData, setFormData] = useState(initialFormData);
  const [rateMatrix, setRateMatrix] = useState(null);
  const [rateMatrixRows, setRateMatrixRows] = useState([]);
  const [activeTab, setActiveTab] = useState(0); 
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  // Sheet 1 Table Structure & Pagination/Search States

  const [sheet1Destinations, setSheet1Destinations] = useState([]);
  const [sheet1Weights, setSheet1Weights] = useState([]);
  const [searchQuery1, setSearchQuery1] = useState("");
  const [page1, setPage1] = useState(0);
  const [rowsPerPage1, setRowsPerPage1] = useState(10);

  // Sheet 2 Search & Pagination States

  const [searchQuery2, setSearchQuery2] = useState("");
  const [page2, setPage2] = useState(0);
  const [rowsPerPage2, setRowsPerPage2] = useState(10);

  // Add New Destination Dialog States
  const [openAddModal, setOpenAddModal] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newWeightRates, setNewWeightRates] = useState({});
  const [newVehicleType, setNewVehicleType] = useState("");
  const [newFreight, setNewFreight] = useState("");

  // Fetch initial vendors and contract data on mount

  useEffect(() => {
    dispatch(fetchContractVendors());
    if (id) {
      dispatch(fetchContractById(id));
    }
  }, [dispatch, id]);

  // Safely populate form data and rate matrix when contract updates in store

  useEffect(() => {
    if (contract) {
      setFormData(buildFormDataFromContract(contract));
      const matrixData = contract.rateMatrix || contract.RateMatrix || contract.matrix || [];
      
      if (Array.isArray(matrixData) && matrixData.length > 0) {
        setRateMatrixRows(matrixData);

        // --- Process Sheet 1 Data ---

        const sheet1RawData = matrixData.filter((row) => {
          const wId = row.WeightID !== undefined ? row.WeightID : row.weightID;
          const vId = row.VehicleTypeID !== undefined ? row.VehicleTypeID : row.vehicleTypeID;
          return (wId !== null && wId !== undefined && wId !== "") || (vId === null || vId === undefined);
        });

        if (sheet1RawData.length > 0) {
          const uniqueWeights = Array.from(
            new Set(
              sheet1RawData
                .map((row) => {
                  const w = row.weight || row.Weight;
                  if (w && (w.FromWeight !== undefined || w.fromWeight !== undefined)) {
                    return `${w.FromWeight !== undefined ? w.FromWeight : w.fromWeight} MT`.trim();

                  }
                  return row.WeightID ? `Weight ID ${row.WeightID}` : "Standard Rate";
                })
                .filter(Boolean)
            )
          );

          const cityMap = {};
          sheet1RawData.forEach((row) => {
            const destObj = row.destination || row.Destination;
            const cityName = destObj?.City || destObj?.city || `Destination ${row.DestinationID || row.destinationID || "N/A"}`;
            
            const w = row.weight || row.Weight;
            const weightLabel = (w && (w.FromWeight !== undefined || w.fromWeight !== undefined)) 
              ? `${w.FromWeight !== undefined ? w.FromWeight : w.fromWeight} MT`.trim() 
              : (row.WeightID ? `Weight ID ${row.WeightID}` : "Standard Rate");

            if (!cityMap[cityName]) {
              cityMap[cityName] = { cityName, rates: {} };

            }
            cityMap[cityName].rates[weightLabel] = {
              RateID: row.RateID !== undefined ? row.RateID : row.rateID,
              BaseRate: row.BaseRate !== undefined ? row.BaseRate : row.baseRate || ""
            };
          });

          setSheet1Weights(uniqueWeights);
          setSheet1Destinations(Object.values(cityMap));
        }
      }
    }
  }, [contract]);

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.VendorID) nextErrors.VendorID = "Vendor selection is required.";
    if (!formData.ContractNumber.trim()) nextErrors.ContractNumber = "Contract Number is required.";
    if (!formData.ValidFrom) nextErrors.ValidFrom = "Validity From is required.";
    if (!formData.ValidTo) nextErrors.ValidTo = "Validity To is required.";
    if (formData.ValidFrom && formData.ValidTo && formData.ValidTo < formData.ValidFrom) {
      nextErrors.ValidTo = "Validity To cannot be earlier than Validity From.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };


  const handleVendorChange = (event) => {
    const targetVendorId = event.target.value;
    const selectedVendorObj = vendors.find((v) => String(v.VendorID) === String(targetVendorId));
    
    setFormData((prev) => ({
      ...prev,
      VendorID: targetVendorId,
      VendorPAN: selectedVendorObj?.PANNo || selectedVendorObj?.PANNumber || selectedVendorObj?.VendorPAN || "",
    }));
    setErrors((prev) => ({ ...prev, VendorID: "" }));
  };

  const handleRateMatrixChange = (event) => {
    const file = event.target.files?.[0] || null;
    const allowedExtensions = [".xls", ".xlsx"];
    const extension = file?.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (file && !allowedExtensions.includes(extension)) {
      setRateMatrix(null);
      setErrors((prev) => ({ ...prev, RateMatrix: "Only XLS and XLSX files are allowed." }));
      return;
    }
    setRateMatrix(file);
    setErrors((prev) => ({ ...prev, RateMatrix: "" }));
  };

  const handleSheet1TableCellChange = (cityName, weightLabel, newRate) => {
    setSheet1Destinations((prev) =>
      prev.map((dest) => {
        if (dest.cityName === cityName) {
          return {
            ...dest,
            rates: {
              ...dest.rates,
              [weightLabel]: {
                ...dest.rates[weightLabel],
                BaseRate: newRate,
              },
            },
          };
        }
        return dest;
      })
    );

    setRateMatrixRows((prev) =>
      prev.map((row) => {
        const destObj = row.destination || row.Destination;
        const cName = destObj?.City || destObj?.city;
        const w = row.weight || row.Weight;
        const wLabel = (w && (w.FromWeight !== undefined || w.fromWeight !== undefined)) 
          ? `${w.FromWeight !== undefined ? w.FromWeight : w.fromWeight} MT`.trim() 

          : (row.WeightID ? `Weight ID ${row.WeightID}` : "Standard Rate");

        if (cName === cityName && wLabel === weightLabel) {
          return { ...row, BaseRate: newRate };
        }
        return row;
      })
    );
  };

  const handleMatrixRateChange = (rateId, newRate) => {
    setRateMatrixRows((prev) =>
      prev.map((row) => {
        const currentId = row.RateID !== undefined ? row.RateID : row.rateID;
        return currentId === rateId ? { ...row, BaseRate: newRate } : row;
      })
    );
  };

  const handleAddNewDestinationSubmit = () => {
    if (!newCityName.trim()) return;


    if (activeTab === 0) {
      const newRatesObj = {};
      sheet1Weights.forEach((w) => {
        newRatesObj[w] = { RateID: `temp_${Date.now()}_${w}`, BaseRate: newWeightRates[w] || "" };
      });

      const newCityEntry = { cityName: newCityName.trim().toUpperCase(), rates: newRatesObj };

      setSheet1Destinations([newCityEntry, ...sheet1Destinations]);

      const newRowsToAdd = sheet1Weights.map((w) => ({
        RateID: `temp_${Date.now()}_${w}`,
        destination: { City: newCityName.trim().toUpperCase() },
        weight: { FromWeight: parseFloat(w) || 0 },
        WeightID: 1, 

        VehicleTypeID: null,
        BaseRate: newWeightRates[w] || 0
      }));
      setRateMatrixRows([...newRowsToAdd, ...rateMatrixRows]);

    } else {
      if (!newVehicleType.trim() || !newFreight) return;

      const newSheet2Row = {
        RateID: `temp_s2_${Date.now()}`,
        destination: { City: newCityName.trim().toUpperCase() },
        vehicleType: { VehicleName: newVehicleType.trim() },
        VehicleTypeID: 1,

        WeightID: null,
        BaseRate: parseFloat(newFreight) || 0
      };
      setRateMatrixRows([...rateMatrixRows, newSheet2Row]);
    }

    setNewCityName("");
    setNewWeightRates({});
    setNewVehicleType("");

    setNewFreight("");
    setOpenAddModal(false);
  };

  const handleCancel = () => navigate("/contracts");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "ContractNumber") {
        payload.append("ContractNo", formData[key]);
      } else {
        payload.append(key, formData[key]);
      }
    });

    if (rateMatrix) {
      payload.append("rateMatrix", rateMatrix);
    }

    payload.append("editedRates", JSON.stringify(rateMatrixRows));

    const result = await dispatch(editContract({ id, contractData: payload }));

    if (editContract.fulfilled.match(result)) {
      setSnackbar({
        open: true,
        severity: "success",
        message: "Contract and Matrix updated successfully.",
      });
      setTimeout(() => navigate("/contracts"), 1000);
      return;
    }

    const backendErrors = result.payload?.errors;
    setSnackbar({
      open: true,
      severity: "error",
      message: Array.isArray(backendErrors) ? backendErrors.join(" ") : result.payload?.message || "Failed to update contract.",
    });
  };

  const filteredSheet1 = sheet1Destinations.filter((dest) =>
    dest.cityName.toLowerCase().includes(searchQuery1.toLowerCase())
  );

  const sheet2Rows = rateMatrixRows.filter((r) => {
    const vId = r.VehicleTypeID !== undefined ? r.VehicleTypeID : r.vehicleTypeID;
    return vId !== null && vId !== undefined && vId !== "";
  });

  const filteredSheet2 = sheet2Rows.filter((row) => {
    const destObj = row.destination || row.Destination;
    const vehicleObj = row.vehicleType || row.VehicleType;
    const cityName = destObj?.City || destObj?.city || "";
    const vehicleName = vehicleObj?.VehicleName || vehicleObj?.vehicleName || "";
    return (
      cityName.toLowerCase().includes(searchQuery2.toLowerCase()) ||
      vehicleName.toLowerCase().includes(searchQuery2.toLowerCase())
    );
  });

  return (
    <Box sx={{ p: 3, maxWidth: "1000px", mx: "auto" }}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)" }}>
        <PageHeader
          title="Edit Contract & Rate Matrix"
          breadcrumbs={[
            { label: "Dashboard", path: "/vendors" },
            { label: "Contract Master", path: "/contracts" },
            { label: "Edit Contract" },
          ]}
        />

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }} noValidate>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}>
            Contract Basic Parameters
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 3,
              alignItems: "start",
            }}
          >
            {/* Vendor Selector Dropdown */}
            <FormControl fullWidth variant="outlined" error={Boolean(errors.VendorID)} size="small">
              <InputLabel shrink>Vendor</InputLabel>
              <Select
                label="Vendor"
                name="VendorID"
                displayEmpty
                notched
                value={formData.VendorID}
                onChange={handleVendorChange}
              >
                <MenuItem value="" disabled>Select Vendor</MenuItem>
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.VendorID} value={vendor.VendorID}>
                    {vendor.VendorName}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.VendorID}</FormHelperText>
            </FormControl>

            {/* Vendor PAN Number Field */}
            <TextField
              fullWidth
              variant="outlined"
              label="Vendor PAN Number"
              name="VendorPAN"
              value={formData.VendorPAN}
              slotProps={{
                input: { readOnly: true },
                inputLabel: { shrink: true },
              }}
            />

            {/* Contract Number Field */}
            <TextField
              fullWidth
              variant="outlined"
              label="Contract Number"
              name="ContractNumber"
              value={formData.ContractNumber}
              onChange={handleChange}
              error={Boolean(errors.ContractNumber)}
              helperText={errors.ContractNumber}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            {/* Contract Status Selector */}
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel shrink>Contract Status</InputLabel>
              <Select
                label="Contract Status"
                name="Status"
                notched
                value={formData.Status}
                onChange={handleChange}
              >
                {contractStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Validity From Date */}
            <TextField
              fullWidth
              variant="outlined"
              label="Validity From"
              name="ValidFrom"
              type="date"
              value={formData.ValidFrom}
              onChange={handleChange}
              error={Boolean(errors.ValidFrom)}
              helperText={errors.ValidFrom}
              slotProps={{
                inputLabel: { shrink: true },
                input: { notched: true },
              }}
            />

            {/* Validity To Date */}
            <TextField
              fullWidth
              variant="outlined"
              label="Validity To"
              name="ValidTo"
              type="date"
              value={formData.ValidTo}
              onChange={handleChange}
              error={Boolean(errors.ValidTo)}
              helperText={errors.ValidTo}
              slotProps={{
                inputLabel: { shrink: true },
                input: { notched: true },
              }}
            />
          </Box>

          <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" }, gap: 3 }}>
            <Box>
              <Button
                fullWidth
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{ py: 1.8, justifyContent: "center", textTransform: "none" }}
              >
                <Typography noWrap variant="body2">
                  {rateMatrix ? rateMatrix.name : contract?.RateMatrixFileName ? `Replace: ${contract.RateMatrixFileName}` : "Upload New Excel Matrix"}
                </Typography>
                <input hidden type="file" accept=".xls,.xlsx" onChange={handleRateMatrixChange} />
              </Button>
            </Box>

            <TextField
              fullWidth
              variant="outlined"
              label="General Remarks"
              name="Remarks"
              value={formData.Remarks}
              onChange={handleChange}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Rate Matrix Sheets View & Edit Section */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
              Contract Rate Matrix (Sheets Preview & Edit)
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Add />}
              onClick={() => setOpenAddModal(true)}
              size="small"
            >
              Add New Destination
            </Button>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
              <Tab label={`Sheet 1: Domestic Destinations (${sheet1Destinations.length})`} />
              <Tab label={`Sheet 2: Additional Destinations (${sheet2Rows.length})`} />
            </Tabs>
          </Box>

          {/* Sheet 1: Domestic Destinations with Search, Sticky Column and Horizontal Scrolling */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <TextField
                  size="small"
                  placeholder="Find destination city..."
                  value={searchQuery1}
                  onChange={(e) => { setSearchQuery1(e.target.value); setPage1(0); }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: "260px" }}
                />
              </Box>

              <Box 
                sx={{ 
                  width: "100%", 
                  overflowX: "auto", 
                  overflowY: "hidden",
                  display: "block",
                  "&::-webkit-scrollbar": { height: 8 },
                  "&::-webkit-scrollbar-thumb": { backgroundColor: "#bdbdbd", borderRadius: 4 }
                }}
              >
                <TableContainer 
                  component={Paper} 
                  sx={{ border: "1px solid #e0e0e0", maxHeight: 500, boxShadow: "none" }}
                >
                  <Table stickyHeader size="small" sx={{ minWidth: Math.max(700, sheet1Weights.length * 100 + 160) }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            fontWeight: "bold", 
                            bgcolor: "#f5f5f5", 
                            minWidth: 160,
                            maxWidth: 160,
                            position: "sticky", 
                            left: 0, 
                            zIndex: 3,
                            borderRight: "1px solid #e0e0e0"
                          }}
                        >
                          DESTINATION
                        </TableCell>
                        {sheet1Weights.map((weight) => (
                          <TableCell key={weight} align="center" sx={{ fontWeight: "bold", bgcolor: "#e2e8f0", minWidth: 100 }}>
                            {weight}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSheet1
                        .slice(page1 * rowsPerPage1, page1 * rowsPerPage1 + rowsPerPage1)
                        .map((dest) => (
                          <TableRow key={dest.cityName} hover>
                            <TableCell 
                              sx={{ 
                                fontWeight: 500, 
                                bgcolor: "#ffffff", 
                                position: "sticky", 
                                left: 0, 
                                zIndex: 2, 
                                minWidth: 160,
                                maxWidth: 160,
                                borderRight: "1px solid #e0e0e0",
                                boxShadow: "2px 0 5px rgba(0,0,0,0.05)" 
                              }}
                            >
                              {dest.cityName}
                            </TableCell>
                            {sheet1Weights.map((weight) => {
                              const cellData = dest.rates[weight] || {};
                              return (
                                <TableCell key={weight} align="center" sx={{ minWidth: 100 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={cellData.BaseRate !== undefined ? cellData.BaseRate : ""}
                                    onChange={(e) => handleSheet1TableCellChange(dest.cityName, weight, e.target.value)}
                                    sx={{ width: "85px" }}
                                    slotProps={{
                                      htmlInput: { style: { textAlign: "center", padding: "6px" } }
                                    }}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      {filteredSheet1.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={sheet1Weights.length + 1} align="center">
                            No matching destination records found.
                          </TableCell>

                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <TablePagination
                component="div"
                count={filteredSheet1.length}
                page={page1}
                onPageChange={(e, newPage) => setPage1(newPage)}
                rowsPerPage={rowsPerPage1}
                onRowsPerPageChange={(e) => { setRowsPerPage1(parseInt(e.target.value, 10)); setPage1(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          )}

          {/* Sheet 2: Additional Destinations with Search and Pagination */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <TextField
                  size="small"
                  placeholder="Find destination or vehicle..."
                  value={searchQuery2}
                  onChange={(e) => { setSearchQuery2(e.target.value); setPage2(0); }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: "260px" }}
                />
              </Box>

              <TableContainer component={Paper} sx={{ border: "1px solid #e0e0e0", maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Destination City</TableCell>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Vehicle Type / ODC Details</TableCell>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Freight (INR)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSheet2
                      .slice(page2 * rowsPerPage2, page2 * rowsPerPage2 + rowsPerPage2)
                      .map((row) => {
                        const destObj = row.destination || row.Destination;
                        const vehicleObj = row.vehicleType || row.VehicleType;
                        const cityName = destObj?.City || destObj?.city || `Destination ${row.DestinationID || row.destinationID}`;
                        const vehicleName = vehicleObj?.VehicleName || vehicleObj?.vehicleName || `Vehicle ${row.VehicleTypeID || row.vehicleTypeID}`;
                        const rateId = row.RateID !== undefined ? row.RateID : row.rateID;

                        return (
                          <TableRow key={rateId} hover>
                            <TableCell>{cityName}</TableCell>
                            <TableCell>{vehicleName}</TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={row.BaseRate !== undefined ? row.BaseRate : row.baseRate}
                                onChange={(e) => handleMatrixRateChange(rateId, e.target.value)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {filteredSheet2.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No matching additional destination records found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredSheet2.length}
                page={page2}
                onPageChange={(e, newPage) => setPage2(newPage)}
                rowsPerPage={rowsPerPage2}
                onRowsPerPageChange={(e) => { setRowsPerPage2(parseInt(e.target.value, 10)); setPage2(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          )}

          <Box mt={5} sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" sx={{ px: 4 }} onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" sx={{ px: 5 }} startIcon={<Save />} type="submit" disabled={saving}>
              Save Contract Changes
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Add New Destination Dialog Modal */}
      <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Destination ({activeTab === 0 ? "Sheet 1" : "Sheet 2"})</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <TextField
              label="Destination City Name"
              fullWidth
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              placeholder="e.g. SURAT"
            />

            {activeTab === 0 ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Enter Rates for Weight Slabs:</Typography>
                <Grid container spacing={2}>
                  {sheet1Weights.map((weight) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={weight}>
                      <TextField
                        label={weight}
                        size="small"
                        type="number"
                        fullWidth
                        value={newWeightRates[weight] || ""}
                        onChange={(e) => setNewWeightRates({ ...newWeightRates, [weight]: e.target.value })}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : (
              <>
                <TextField
                  label="Vehicle Type / ODC Details"
                  fullWidth
                  value={newVehicleType}
                  onChange={(e) => setNewVehicleType(e.target.value)}
                  placeholder="e.g. 9 MT (ODC)-20FT"
                />
                <TextField
                  label="Freight Amount (INR)"
                  fullWidth
                  type="number"
                  value={newFreight}
                  onChange={(e) => setNewFreight(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNewDestinationSubmit}>Add Destination</Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />

      <LoadingOverlay
        open={loading || saving}
        message={saving ? "Updating Matrix & Contract..." : "Loading Contract record..."}
      />
    </Box>

  );
};

export default EditContract;