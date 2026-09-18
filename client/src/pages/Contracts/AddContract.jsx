import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
  Divider,
} from "@mui/material";
<<<<<<< HEAD
import { CloudUpload, Download } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
=======
import { CloudUpload } from "@mui/icons-material";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";

import {
  addContract,
  clearSelectedContract,
  editContract,
  fetchContractById,
  fetchContractVendors,
} from "../../redux/slices/contractSlice";

<<<<<<< HEAD
const DISPLAY_DATE_FORMAT = "DD/MM/YYYY";

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const initialFormData = {
  VendorID: "",
  VendorPAN: "",
  ContractNumber: "",
<<<<<<< HEAD
  ValidFrom: "", // Stored as YYYY-MM-DD string for API
  ValidTo: "",   // Stored as YYYY-MM-DD string for API
=======
  ValidFrom: "",
  ValidTo: "",
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  Remarks: "",
  Status: "Draft",
};

const contractStatuses = ["Draft", "Active", "Expired", "Cancelled"];

<<<<<<< HEAD
// Helper to convert backend string to dayjs for DatePicker
const toDayjsValue = (val) => {
  if (!val) return null;
  const parsed = dayjs(val);
  return parsed.isValid() ? parsed : null;
};

// Helper to format DatePicker value to YYYY-MM-DD for backend and form state
const parseDateForApi = (newValue) => {
  if (!newValue || !dayjs(newValue).isValid()) return "";
  return dayjs(newValue).format("YYYY-MM-DD");
=======
const formatDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
};

const buildFormDataFromContract = (contract) => ({
  VendorID: contract?.VendorID || "",
  VendorPAN: contract?.VendorPAN || contract?.vendor?.PANNo || "",
  ContractNumber: contract?.ContractNo || "",
<<<<<<< HEAD
  ValidFrom: contract?.ContractStartDate ? String(contract.ContractStartDate).slice(0, 10) : "",
  ValidTo: contract?.ContractEndDate ? String(contract.ContractEndDate).slice(0, 10) : "",
=======
  ValidFrom: formatDate(contract?.ContractStartDate),
  ValidTo: formatDate(contract?.ContractEndDate),
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  Remarks: contract?.Remarks || "",
  Status: contract?.Status || "Draft",
});

const mapBackendErrors = (backendErrors = []) => {
  const nextErrors = {};
  backendErrors.forEach((message) => {
    if (message.includes("Vendor")) nextErrors.VendorID = message;
    else if (message.includes("Contract Number") || message.includes("ContractNo")) nextErrors.ContractNumber = message;
    else if (message.includes("Valid From")) nextErrors.ValidFrom = message;
    else if (message.includes("Valid To")) nextErrors.ValidTo = message;
    else if (message.includes("Excel")) nextErrors.RateMatrix = message;
  });
  return nextErrors;
};

const AddContract = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { vendors, contract, loading, saving } = useSelector((state) => state.contract);
  
  const isEditMode = Boolean(id) && location.pathname.includes("/edit/");
  const isViewMode = Boolean(id) && location.pathname.includes("/view/");
  const isReadOnly = isViewMode;

  const [formData, setFormData] = useState(initialFormData);
  const [rateMatrix, setRateMatrix] = useState(null);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    dispatch(fetchContractVendors());
    if (id) dispatch(fetchContractById(id));
    else dispatch(clearSelectedContract());
  }, [dispatch, id]);

  useEffect(() => {
    if (contract && id) {
      setFormData(buildFormDataFromContract(contract));
    }
  }, [contract, id]);

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.VendorID) nextErrors.VendorID = "Vendor selection is required.";
    if (!formData.ContractNumber.trim()) nextErrors.ContractNumber = "Contract Number is required.";
    if (!formData.ValidFrom) nextErrors.ValidFrom = "Validity From is required.";
    if (!formData.ValidTo) nextErrors.ValidTo = "Validity To is required.";
    if (formData.ValidFrom && formData.ValidTo && formData.ValidTo < formData.ValidFrom) {
      nextErrors.ValidTo = "Validity To cannot be earlier than Validity From.";
    }
    if (!rateMatrix && !contract?.RateMatrixFileName) {
      nextErrors.RateMatrix = "Rate Matrix Excel sheet is required.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

<<<<<<< HEAD
  const handleDateChange = (field, newValue) => {
    const formattedDate = parseDateForApi(newValue);
    setFormData((prev) => ({ ...prev, [field]: formattedDate }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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

  const handleReset = () => {
    setFormData(initialFormData);
    setRateMatrix(null);
    setErrors({});
  };

  const handleCancel = () => navigate("/contracts");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isReadOnly) return;
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

    const result = isEditMode
      ? await dispatch(editContract({ id, contractData: payload }))
      : await dispatch(addContract(payload));

    if (addContract.fulfilled.match(result) || editContract.fulfilled.match(result)) {
      setSnackbar({
        open: true,
        severity: "success",
        message: isEditMode ? "Contract updated successfully." : "Contract saved successfully.",
      });
      setTimeout(() => navigate("/contracts"), 1000);
      return;
    }

    const backendErrors = result.payload?.errors;
    if (Array.isArray(backendErrors)) setErrors((prev) => ({ ...prev, ...mapBackendErrors(backendErrors) }));

    setSnackbar({
      open: true,
      severity: "error",
      message: Array.isArray(backendErrors) ? backendErrors.join(" ") : result.payload?.message || "Failed to save contract.",
    });
  };

  return (
<<<<<<< HEAD
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={3}>
        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)" }}>
          <PageHeader
            title={isViewMode ? "View Contract" : isEditMode ? "Edit Contract" : "Create Contract"}
            breadcrumbs={[
              { label: "Dashboard", path: "/dashboard" },
              { label: "Contract Master", path: "/contracts" },
              { label: isViewMode ? "View" : isEditMode ? "Edit" : "Create" },
            ]}
          />

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }} noValidate>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}>
              Contract Basic Parameters
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr 1fr",
                },
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
                  disabled={isReadOnly}
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
              <CustomTextField
                label="Vendor PAN Number"
                name="VendorPAN"
                value={formData.VendorPAN}
                slotProps={{
                  input: { readOnly: true },
                  inputLabel: { shrink: true },
                }}
              />

              {/* Contract Number Field */}
              <CustomTextField
                required
                label="Contract Number"
                name="ContractNumber"
                placeholder="Enter Contract Number"
                value={formData.ContractNumber}
                onChange={handleChange}
                error={Boolean(errors.ContractNumber)}
                helperText={errors.ContractNumber}
                slotProps={{
                  input: { readOnly: isReadOnly },
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
                  disabled={isReadOnly}
                >
                  {contractStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Validity From Date Picker */}
              <DatePicker
                label="Validity From"
                value={toDayjsValue(formData.ValidFrom)}
                onChange={(newValue) => handleDateChange("ValidFrom", newValue)}
                format={DISPLAY_DATE_FORMAT}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    error: Boolean(errors.ValidFrom),
                    helperText: errors.ValidFrom,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  },
                }}
              />

              {/* Validity To Date Picker */}
              <DatePicker
                label="Validity To"
                value={toDayjsValue(formData.ValidTo)}
                onChange={(newValue) => handleDateChange("ValidTo", newValue)}
                format={DISPLAY_DATE_FORMAT}
                minDate={formData.ValidFrom ? dayjs(formData.ValidFrom) : undefined}
                disabled={isReadOnly}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    error: Boolean(errors.ValidTo),
                    helperText: errors.ValidTo,
                    slotProps: {
                      inputLabel: { shrink: true },
                    },
                  },
                }}
              />
            </Box>

            {/* Rate Matrix Upload and Remarks Section */}
            <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { md: "1fr 3fr" }, gap: 3 }}>
              <Box>
                <Button
                  fullWidth
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  sx={{
                    py: 1.8,
                    borderColor: errors.RateMatrix ? "error.main" : "rgba(0, 0, 0, 0.23)",
                    justifyContent: "center",
                  }}
                  disabled={isReadOnly}
                >
                  <Typography noWrap variant="body2">
                    {rateMatrix ? rateMatrix.name : contract?.RateMatrixFileName || "Upload Rate Matrix (Excel)"}
                  </Typography>
                  <input hidden type="file" accept=".xls,.xlsx" onChange={handleRateMatrixChange} />
                </Button>
                {errors.RateMatrix && (
                  <FormHelperText error sx={{ mx: 1 }}>{errors.RateMatrix}</FormHelperText>
                )}

                {/* Reference template so whoever is filling the Rate Matrix
                    knows the exact expected column layout (DESTINATION, KM,
                    weight-slab columns on the DOMESTIC DESTINATIONS sheet;
                    DESTINATION / VEHICLE TYPE / FREIGHT on the ADDITIONAL
                    DESTINATIONS sheet) before uploading. Served as a static
                    asset from client/public/templates, so it downloads
                    directly with no backend round-trip. */}
                <Button
                  fullWidth
                  component="a"
                  href="/templates/Contract_RateMatrix_Import_Template.xlsx"
                  download="Contract_RateMatrix_Import_Template.xlsx"
                  variant="text"
                  size="small"
                  startIcon={<Download fontSize="small" />}
                  sx={{ mt: 1, justifyContent: "center", textTransform: "none" }}
                >
                  Download Rate Matrix Template
                </Button>
              </Box>

              <CustomTextField
                label="General Remarks"
                name="Remarks"
                placeholder="Enter additional description comments..."
                value={formData.Remarks}
                onChange={handleChange}
                slotProps={{
                  input: { readOnly: isReadOnly },
                  inputLabel: { shrink: true },
                }}
              />
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Form Footer Action Buttons */}
            <Box sx={{ mt: 5, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" sx={{ px: 4 }} onClick={handleCancel}>
                Cancel
              </Button>
              {!isReadOnly && (
                <Button variant="outlined" sx={{ px: 4 }} onClick={handleReset} disabled={saving}>
                  Reset
                </Button>
              )}
              {!isReadOnly && (
                <CustomButton loading={saving} loadingText="Saving..." type="submit" sx={{ mt: 0, height: 36, maxWidth: "250px", px: 5 }}>
                  Save Contract
                </CustomButton>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Snackbar Feedback Notification */}
        <AppSnackbar
          open={snackbar.open}
          severity={snackbar.severity}
          message={snackbar.message}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        />

        {/* Global Transparent Loader Overlay */}
        <LoadingOverlay
          open={loading || saving}
          message={saving ? "Processing Rate Matrix & Destinations..." : "Loading Template..."}
        />
      </Box>
    </LocalizationProvider>
=======
    <Box p={3}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)" }}>
        <PageHeader
          title={isViewMode ? "View Contract" : isEditMode ? "Edit Contract" : "Create Contract"}
          breadcrumbs={[
            { label: "Dashboard", path: "/vendors" },
            { label: "Contract Master", path: "/contracts" },
            { label: isViewMode ? "View" : isEditMode ? "Edit" : "Create" },
          ]}
        />

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }} noValidate>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}>
            Contract Basic Parameters
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr 1fr",
              },
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
                disabled={isReadOnly}
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
            <CustomTextField
              label="Vendor PAN Number"
              name="VendorPAN"
              value={formData.VendorPAN}
              slotProps={{
                input: { readOnly: true },
                inputLabel: { shrink: true },
              }}
            />

            {/* Contract Number Field */}
            <CustomTextField
              required
              label="Contract Number"
              name="ContractNumber"
              placeholder="Enter Contract Number"
              value={formData.ContractNumber}
              onChange={handleChange}
              error={Boolean(errors.ContractNumber)}
              helperText={errors.ContractNumber}
              slotProps={{
                input: { readOnly: isReadOnly },
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
                disabled={isReadOnly}
              >
                {contractStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Validity From Date */}
            <CustomTextField
              required
              label="Validity From"
              name="ValidFrom"
              type="date"
              value={formData.ValidFrom}
              onChange={handleChange}
              error={Boolean(errors.ValidFrom)}
              helperText={errors.ValidFrom}
              slotProps={{
                input: { readOnly: isReadOnly },
                inputLabel: { shrink: true },
              }}
            />

            {/* Validity To Date */}
            <CustomTextField
              required
              label="Validity To"
              name="ValidTo"
              type="date"
              value={formData.ValidTo}
              onChange={handleChange}
              error={Boolean(errors.ValidTo)}
              helperText={errors.ValidTo}
              slotProps={{
                htmlInput: { min: formData.ValidFrom || undefined },
                input: { readOnly: isReadOnly },
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          {/* Rate Matrix Upload and Remarks Section */}
          <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { md: "1fr 3fr" }, gap: 3 }}>
            <Box>
              <Button
                fullWidth
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{
                  py: 1.8,
                  borderColor: errors.RateMatrix ? "error.main" : "rgba(0, 0, 0, 0.23)",
                  justifyContent: "center",
                }}
                disabled={isReadOnly}
              >
                <Typography noWrap variant="body2">
                  {rateMatrix ? rateMatrix.name : contract?.RateMatrixFileName || "Upload Rate Matrix (Excel)"}
                </Typography>
                <input hidden type="file" accept=".xls,.xlsx" onChange={handleRateMatrixChange} />
              </Button>
              {errors.RateMatrix && (
                <FormHelperText error sx={{ mx: 1 }}>{errors.RateMatrix}</FormHelperText>
              )}
            </Box>

            <CustomTextField
              label="General Remarks"
              name="Remarks"
              placeholder="Enter additional description comments..."
              value={formData.Remarks}
              onChange={handleChange}
              slotProps={{
                input: { readOnly: isReadOnly },
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Form Footer Action Buttons */}
          <Box sx={{ mt: 5, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" sx={{ px: 4 }} onClick={handleCancel}>
              Cancel
            </Button>
            {!isReadOnly && (
              <Button variant="outlined" sx={{ px: 4 }} onClick={handleReset} disabled={saving}>
                Reset
              </Button>
            )}
            {!isReadOnly && (
              <CustomButton loading={saving} loadingText="Saving..." type="submit" sx={{ mt: 0, height: 36,maxWidth: "250px", px: 5 }}>
                Save Contract
              </CustomButton>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Snackbar Feedback Notification */}
      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />

      {/* Global Transparent Loader Overlay */}
      <LoadingOverlay
        open={loading || saving}
        message={saving ? "Processing Rate Matrix & Destinations..." : "Loading Template..."}
      />
    </Box>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  );
};

export default AddContract;