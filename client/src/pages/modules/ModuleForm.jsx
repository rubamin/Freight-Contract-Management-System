import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Save } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { lookupDistrictForCity, DEFAULT_STATE } from "../../constants/gujaratCityLookup";
import { getRecords } from "../../services/moduleService";
import { buildDuplicateKey, buildExistingKeySet } from "../../utils/duplicateCheck.js";
import { playAlertSound } from "../../utils/alertSound.js";
import {
  createModuleRecord,
  updateModuleRecord,
  fetchModuleRecordById,
  clearCurrentModuleRecord,
} from "../../redux/slices/moduleSlice";

// Builds the initial (empty) form state from a config's formFields list.
const buildEmptyFormData = (formFields) => {
  const data = {};
  formFields.forEach((field) => {
    if (field.type === "checkbox") {
      data[field.name] = true;
    } else if (field.defaultValue !== undefined) {
      data[field.name] = field.defaultValue;
    } else {
      data[field.name] = "";
    }
  });
  return data;
};

// City -> District/State auto-fill (task item 7). Only applies to fields
// explicitly flagged for it, so this stays generic rather than hardcoding
// "City" for every module that happens to have one.
const applyAutoFill = (row, field, value) => {
  const next = { ...row, [field.name]: value };
  if (field.autoFillsDistrictState) {
    next.District = lookupDistrictForCity(value);
    next.State = DEFAULT_STATE;
  }
  return next;
};

// District/State stay read-only while the City lookup found a match, but
// become editable the moment it doesn't (task item 6) - a blank field the
// user can never fill in would otherwise leave the record incomplete.
const resolveFieldReadOnly = (field, row) => {
  if (!field.autoFillDependent) return Boolean(field.readOnly);
  return Boolean(field.readOnly) && Boolean(lookupDistrictForCity(row.City));
};

const normalizeFormValue = (field, value) => {
  if (field.type === "checkbox") {
    return Boolean(value);
  }

  if (field.type === "number") {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (field.type === "select") {
    return value === "" ? null : value;
  }

  if (field.type === "date") {
    return value || null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value ?? null;
};

const buildSubmissionPayload = (row, formFields) => {
  const payload = {};

  formFields.forEach((field) => {
    payload[field.name] = normalizeFormValue(field, row[field.name]);
  });

  return payload;
};

// Generic add/edit form for any module whose moduleConfigs entry defines
// `formFields`. Handles plain text/number/checkbox/select inputs - masters
// with more specialized UI (Vendor, Contract, User) keep their own
// dedicated pages and don't use this component.
//
// Add mode additionally supports entering several rows at once (up to
// config.maxRows, task item 11) and checks every row for duplicates
// against both the existing master data and the rest of the current batch
// before saving anything (task items 5 & 7).
const ModuleForm = ({ configKey, config }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { currentRecord, saving, loading, error } = useSelector(
    (state) => state.module
  );

  const [rows, setRows] = useState([buildEmptyFormData(config.formFields)]);
  const [rowErrors, setRowErrors] = useState([{}]);
  const [existingRecords, setExistingRecords] = useState([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    if (isEdit) {
      dispatch(fetchModuleRecordById({ config, id }));
    }
    return () => dispatch(clearCurrentModuleRecord());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  useEffect(() => {
    if (isEdit && currentRecord) {
      const next = {};
      config.formFields.forEach((field) => {
        const value = currentRecord[field.name];
        next[field.name] = field.type === "checkbox" ? Boolean(value) : value ?? "";
      });
      setRows([next]);
    }
  }, [isEdit, currentRecord, config.formFields]);

  // Existing records are only needed to pre-check duplicates on Add, for
  // modules that define which fields identify a duplicate.
  useEffect(() => {
    if (isEdit || !config.duplicateCheckFields) return;

    let isMounted = true;
    getRecords({ apiGroup: config.apiGroup, moduleName: config.moduleName, params: { pageSize: 10000 } })
      .then((response) => {
        if (isMounted) setExistingRecords(response.data?.data || []);
      })
      .catch(() => {
        if (isMounted) setExistingRecords([]);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, config.apiGroup, config.moduleName]);

  const handleRowFieldChange = (rowIndex, field, value) => {
    setRows((prev) =>
      prev.map((row, index) => (index === rowIndex ? applyAutoFill(row, field, value) : row))
    );
    setRowErrors((prev) =>
      prev.map((rowErr, index) => (index === rowIndex ? { ...rowErr, [field.name]: "" } : rowErr))
    );
  };

  const addRow = () => {
    const maxRows = config.maxRows || 10;
    if (rows.length >= maxRows) return;
    setRows((prev) => [...prev, buildEmptyFormData(config.formFields)]);
    setRowErrors((prev) => [...prev, {}]);
  };

  const removeRow = (rowIndex) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, index) => index !== rowIndex));
    setRowErrors((prev) => prev.filter((_, index) => index !== rowIndex));
  };

  // Checks every row against existing master records and the rest of the
  // current batch. Returns the per-row error map; rows/fields with an
  // entry there are the ones to highlight.
  const findDuplicateRowErrors = () => {
    const fields = config.duplicateCheckFields;
    const nextRowErrors = rows.map(() => ({}));
    if (!fields) return nextRowErrors;

    const existingKeys = buildExistingKeySet(existingRecords, fields);
    const priorRowKeys = [];

    rows.forEach((row, index) => {
      const key = buildDuplicateKey(row, fields);
      const isFilled = key.replace(/\|/g, "") !== "";
      if (isFilled && (existingKeys.has(key) || priorRowKeys.includes(key))) {
        fields.forEach((fieldName) => {
          nextRowErrors[index][fieldName] = "Already exists.";
        });
      }
      priorRowKeys.push(key);
    });

    return nextRowErrors;
  };

  const hasAnyError = (allRowErrors) =>
    allRowErrors.some((rowErr) => Object.values(rowErr).some(Boolean));

  const handleEditSubmit = async () => {
    const result = await dispatch(
      updateModuleRecord({ config, id, data: buildSubmissionPayload(rows[0], config.formFields) })
    );
    const apiSuccess = result.meta.requestStatus === "fulfilled" && result.payload?.success !== false;

    if (apiSuccess) {
      setSnackbar({
        open: true,
        severity: "success",
        message: result.payload?.message || `${config.title} updated successfully.`,
      });
      navigate(config.path);
    } else {
      setSnackbar({
        open: true,
        severity: "error",
        message: result.payload?.message || result.payload || `Failed to update ${config.title}.`,
      });
    }
  };

  // Creates every row that passed the duplicate check. Rows the backend
  // still rejects (e.g. a race with another user, or a field-level
  // validation error) are kept on screen with their error shown, so only
  // the failing rows need to be fixed and resubmitted.
  const handleAddSubmit = async () => {
    const duplicateRowErrors = findDuplicateRowErrors();
    if (hasAnyError(duplicateRowErrors)) {
      setRowErrors(duplicateRowErrors);
      setDuplicateMessage(
        `One or more rows duplicate an existing ${config.title} record. Please fix the highlighted field(s) before saving.`
      );
      setDuplicateDialogOpen(true);
      playAlertSound();
      return;
    }

    const outcomes = await Promise.all(
      rows.map((row) =>
        dispatch(createModuleRecord({
          config,
          data: buildSubmissionPayload(row, config.formFields),
        }))
      )
    );

    const remainingRows = [];
    const remainingErrors = [];
    let successCount = 0;

    outcomes.forEach((result, index) => {
      const apiSuccess = createModuleRecord.fulfilled.match(result) && result.payload?.success !== false;
      if (apiSuccess) {
        successCount += 1;
        return;
      }
      remainingRows.push(rows[index]);
      remainingErrors.push({ _general: result.payload?.message || result.payload || "Failed to add this row." });
    });

    if (remainingRows.length === 0) {
      setSnackbar({
        open: true,
        severity: "success",
        message: `${successCount} ${config.title} record(s) added successfully.`,
      });
      navigate(config.path);
      return;
    }

    setRows(remainingRows);
    setRowErrors(remainingErrors);
    setSnackbar({
      open: true,
      severity: successCount > 0 ? "warning" : "error",
      message: `${successCount} record(s) added. ${remainingRows.length} row(s) failed - please review and retry.`,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isEdit) {
      await handleEditSubmit();
    } else {
      await handleAddSubmit();
    }
  };

  const renderFormField = (field, row, rowIndex) => {
    const fieldError = rowErrors[rowIndex]?.[field.name];
    const readOnly = resolveFieldReadOnly(field, row);
    const value = row[field.name] ?? "";

    if (field.type === "select") {
      return (
        <Grid item xs={12} sm={6} key={field.name}>
          <TextField
            select
            fullWidth
            label={field.label}
            required={field.required}
            value={value}
            onChange={(e) => handleRowFieldChange(rowIndex, field, e.target.value)}
          >
            {(field.options || []).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }

    if (field.type === "checkbox") {
      return (
        <Grid item xs={12} sm={6} key={field.name}>
          <TextField
            select
            fullWidth
            label={field.label}
            value={row[field.name] ? "true" : "false"}
            onChange={(e) => handleRowFieldChange(rowIndex, field, e.target.value === "true")}
          >
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
        </Grid>
      );
    }

    return (
      <Grid item xs={12} sm={6} key={field.name}>
        <TextField
          fullWidth
          type={field.type || "text"}
          label={field.label}
          required={field.required}
          disabled={readOnly}
          value={value}
          error={Boolean(fieldError)}
          helperText={
            fieldError ||
            (field.autoFillDependent && !readOnly
              ? "Not found in lookup - please enter manually."
              : undefined)
          }
          onChange={(e) => handleRowFieldChange(rowIndex, field, e.target.value)}
        />
      </Grid>
    );
  };

  const maxRows = config.maxRows || 10;
  const showMultiRowUi = !isEdit && config.multiRowEntry;

  return (
    <Box p={3}>
      <PageHeader
        title={`${isEdit ? "Edit" : "Add"} ${config.title}`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: config.title, path: config.path },
          { label: isEdit ? "Edit" : "Add" },
        ]}
      />

      <Box component="form" onSubmit={handleSubmit}>
        {rows.map((row, rowIndex) => (
          <Paper key={rowIndex} sx={{ p: 3, mb: 2 }}>
            {showMultiRowUi && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Row {rowIndex + 1}
                </Typography>
                {rows.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeRow(rowIndex)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}

            {rowErrors[rowIndex]?._general && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {rowErrors[rowIndex]._general}
              </Alert>
            )}

            <Grid container spacing={2}>
              {config.formFields.map((field) => renderFormField(field, row, rowIndex))}
            </Grid>
          </Paper>
        ))}

        {showMultiRowUi && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addRow}
            disabled={rows.length >= maxRows}
            sx={{ mb: 3 }}
          >
            Add Another Row ({rows.length}/{maxRows})
          </Button>
        )}

        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" startIcon={<Save />} disabled={saving}>
            {isEdit ? "Save Changes" : `Add ${config.title}`}
          </Button>
          <Button variant="outlined" onClick={() => navigate(config.path)}>
            Cancel
          </Button>
        </Box>
      </Box>

      <Dialog open={duplicateDialogOpen} onClose={() => setDuplicateDialogOpen(false)}>
        <DialogTitle>Duplicate Entry Detected</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{duplicateMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setDuplicateDialogOpen(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay open={loading || saving} message="Saving..." />

      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default ModuleForm;
