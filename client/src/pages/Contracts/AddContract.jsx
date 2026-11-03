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
  TextField,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";
import RateMatrixTemplateLink from "../../components/common/RateMatrixTemplateLink";
import { UPLOAD_RULES, findUploadRuleViolation } from "../../constants/uploadRules";
import UploadRequirementsHint from "../../components/common/UploadRequirementsHint";
import ContractTypePicker from "../../components/common/ContractTypePicker";
import { getRedirectDelay, getSaveSuccessMessage, isPendingApproval } from "../../utils/saveResult";
import { DEFAULT_CONTRACT_TYPE, getContractTypeLabel } from "../../constants/contractTypes";
import {
  REMARK_MAX_LENGTH,
  USER_REMARKS_LABEL,
  SYSTEM_REMARKS_LABEL,
  SYSTEM_REMARKS_HELPER,
} from "../../constants/remarks";

import {
  addContract,
  clearSelectedContract,
  editContract,
  fetchContractById,
  fetchContractVendors,
} from "../../redux/slices/contractSlice";

const DISPLAY_DATE_FORMAT = "DD/MM/YYYY";

const initialFormData = {
  ContractType: "", // chosen first on the create page
  VendorID: "",
  VendorPAN: "",
  ContactPerson: "",
  ValidFrom: "", // Stored as YYYY-MM-DD string for API
  ValidTo: "",   // Stored as YYYY-MM-DD string for API
  UserRemarks: "",
  Status: "Draft",
};

const contractStatuses = ["Draft", "Active", "Expired", "Cancelled"];

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
};

const buildFormDataFromContract = (contract) => ({
  ContractType: contract?.ContractType || DEFAULT_CONTRACT_TYPE,
  VendorID: contract?.VendorID || "",
  VendorPAN: contract?.VendorPAN || contract?.vendor?.PANNo || "",
  ContactPerson: contract?.ContactPerson || contract?.vendor?.ContactPerson || "",
  ValidFrom: contract?.ContractStartDate ? String(contract.ContractStartDate).slice(0, 10) : "",
  ValidTo: contract?.ContractEndDate ? String(contract.ContractEndDate).slice(0, 10) : "",
  UserRemarks: contract?.UserRemarks || "",
  Status: contract?.Status || "Draft",
});

const mapBackendErrors = (backendErrors = []) => {
  const nextErrors = {};
  backendErrors.forEach((message) => {
    if (message.includes("Vendor")) nextErrors.VendorID = message;
    else if (message.includes("Valid From")) nextErrors.ValidFrom = message;
    else if (message.includes("Valid To")) nextErrors.ValidTo = message;
    else if (message.includes("Excel") || message.includes("Sheet") || message.includes("sheet")) nextErrors.RateMatrix = message;
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

  const handleDateChange = (field, newValue) => {
    const formattedDate = parseDateForApi(newValue);
    setFormData((prev) => ({ ...prev, [field]: formattedDate }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleVendorChange = (event) => {
    const targetVendorId = event.target.value;
    const selectedVendorObj = vendors.find((v) => String(v.VendorID) === String(targetVendorId));
    
    setFormData((prev) => ({
      ...prev,
      VendorID: targetVendorId,
      VendorPAN: selectedVendorObj?.PANNo || selectedVendorObj?.PANNumber || selectedVendorObj?.VendorPAN || "",
      ContactPerson: selectedVendorObj?.ContactPerson || selectedVendorObj?.VendorName || "",
    }));
    setErrors((prev) => ({ ...prev, VendorID: "" }));
  };

  const handleRateMatrixChange = (event) => {
    const file = event.target.files?.[0] || null;
    const violation = findUploadRuleViolation(file, UPLOAD_RULES.CONTRACT_RATE_MATRIX);

    if (violation) {
      setRateMatrix(null);
      setErrors((prev) => ({ ...prev, RateMatrix: violation }));
      return;
    }
    setRateMatrix(file);
    setErrors((prev) => ({ ...prev, RateMatrix: "" }));
  };

  // The type is chosen on the first step, so Reset keeps it.
  const handleReset = () => {
    setFormData((prev) => ({ ...initialFormData, ContractType: prev.ContractType }));
    setRateMatrix(null);
    setErrors({});
  };

  const handleCancel = () => navigate("/contracts");

  const handleContractTypeSelect = (contractType) => {
    setFormData((prev) => ({ ...prev, ContractType: contractType }));
    setRateMatrix(null);
    setErrors({});
  };

  const isTypeStep = !id && !formData.ContractType;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isReadOnly) return;
    if (!validateForm()) return;

    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      payload.append(key, formData[key]);
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
        severity: isPendingApproval(result.payload) ? "info" : "success",
        message: getSaveSuccessMessage(result.payload, isEditMode ? "Contract updated successfully." : "Contract saved successfully."),
      });
      setTimeout(() => navigate("/contracts"), getRedirectDelay(result.payload));
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

          {isTypeStep ? (
            <Box sx={{ mt: 4 }}>
              <ContractTypePicker
                title="Which type of contract is this?"
                subtitle="The Excel template and the invoice columns depend on the contract type."
                onSelect={handleContractTypeSelect}
              />
              <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
                <Button variant="outlined" sx={{ px: 4 }} onClick={handleCancel}>
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }} noValidate>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                Contract Basic Parameters
              </Typography>
              <Chip color="primary" variant="outlined" label={getContractTypeLabel(formData.ContractType)} />
              {!id && (
                <Button size="small" sx={{ textTransform: "none" }} onClick={() => handleContractTypeSelect("")}>
                  Change Type
                </Button>
              )}
            </Box>

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

              {/* Contact Person Field - filled from the selected vendor, editable */}
              <CustomTextField
                label="Contact Person"
                name="ContactPerson"
                placeholder="Enter Contact Person Name"
                value={formData.ContactPerson}
                onChange={handleChange}
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
                  <input hidden type="file" accept={UPLOAD_RULES.CONTRACT_RATE_MATRIX.accept} onChange={handleRateMatrixChange} />
                </Button>
                <UploadRequirementsHint rule={UPLOAD_RULES.CONTRACT_RATE_MATRIX} sx={{ mt: 0.5, mx: 1 }} />
                {errors.RateMatrix && (
                  <FormHelperText error sx={{ mx: 1 }}>{errors.RateMatrix}</FormHelperText>
                )}
                <RateMatrixTemplateLink contractType={formData.ContractType} />
              </Box>

              <TextField
                fullWidth
                label={USER_REMARKS_LABEL}
                name="UserRemarks"
                placeholder="Enter your remarks..."
                value={formData.UserRemarks}
                onChange={handleChange}
                slotProps={{
                  input: { readOnly: isReadOnly },
                  inputLabel: { shrink: true },
                  htmlInput: { maxLength: REMARK_MAX_LENGTH },
                }}
              />
            </Box>

            {/* System remarks exist once the contract is saved (view mode) */}
            {isReadOnly && contract && (
              <TextField
                fullWidth
                disabled
                sx={{ mt: 3 }}
                label={SYSTEM_REMARKS_LABEL}
                value={contract.Remarks || "-"}
                helperText={SYSTEM_REMARKS_HELPER}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}

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
          )}
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
  );
};

export default AddContract;