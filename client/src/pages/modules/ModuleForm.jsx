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
import { lookupDistrictForCity } from "../../constants/indiaCityDistrictLookup";
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

// City/area -> District/State auto-fill (task item 7, nationwide). Only
// applies to fields explicitly flagged for it, so this stays generic
// rather than hardcoding "City" for every module that happens to have one.
//
// lookupDistrictForCity() returns an array - some city/area names exist in
// more than one district/state (e.g. "Aurangabad" is both in Maharashtra
// and Bihar):
// - Exactly one match: auto-fill District/State immediately, as before.
// - Zero matches: leave District/State blank and editable, as before.
// - More than one match: leave District/State blank here - the District
//   field itself renders as a picker in that case (see renderFormField
//   below), and applyDistrictSelection() fills both fields once the user
//   picks one of the offered districts.
const applyAutoFill = (row, field, value) => {
  const next = { ...row, [field.name]: value };
  if (field.autoFillsDistrictState) {
    const matches = lookupDistrictForCity(value);
    if (matches.length === 1) {
      next.District = matches[0].district;
      next.State = matches[0].state;
    } else {
      next.District = "";
      next.State = "";
    }
  }
  return next;
};

// Fills District + State from a single chosen match, for City/area names
// that resolve to more than one district/state (task item 7, nationwide).
const applyDistrictSelection = (row, match) => ({
  ...row,
  District: match.district,
  State: match.state,
});

// District/State stay read-only while the City lookup found exactly one
// match, and become editable the moment it finds none (task item 6) - a
// blank field the user can never fill in would otherwise leave the record
// incomplete. When the City resolves to MULTIPLE districts, the District
// field is rendered as an active picker instead of a disabled text field
// (see renderFormField), so it must not be marked read-only here; State
// stays read-only either way since it's always derived, never typed.
const resolveFieldReadOnly = (field, row) => {
  if (!field.autoFillDependent) return Boolean(field.readOnly);
  const matches = lookupDistrictForCity(row.City);
  if (matches.length > 1 && field.name === "District") return false;
  return Boolean(field.readOnly) && matches.length >= 1;
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

  // Called when the user picks one option from the District picker shown
  // for a City/area that resolves to more than one district/state (task
  // item 7, nationwide) - fills District + State together from that match.
  const handleDistrictOptionSelect = (rowIndex, match) => {
    setRows((prev) =>
      prev.map((row, index) => (index === rowIndex ? applyDistrictSelection(row, match) : row))
    );
    setRowErrors((prev) =>
      prev.map((rowErr, index) => (index === rowIndex ? { ...rowErr, District: "" } : rowErr))
    );
  };

  // Blocks save when a City resolved to more than one district/state and
  // the user hasn't picked one yet (task item 7, nationwide ambiguous
  // cities like Aurangabad) - otherwise the record would save with a blank
  // District/State despite the lookup having real options to offer.
  const findAmbiguousDistrictRowErrors = () => {
    const cityField = config.formFields.find((f) => f.autoFillsDistrictState);
    if (!cityField) return rows.map(() => ({}));

    return rows.map((row) => {
      const matches = lookupDistrictForCity(row[cityField.name]);
      if (matches.length > 1 && !row.District) {
        return { District: "This city exists in multiple districts - please select one." };
      }
      return {};
    });
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
    const ambiguousRowErrors = findAmbiguousDistrictRowErrors();
    if (hasAnyError(ambiguousRowErrors)) {
      setRowErrors(ambiguousRowErrors);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Please select a District for the city before saving.",
      });
      return;
    }

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
    const ambiguousRowErrors = findAmbiguousDistrictRowErrors();
    if (hasAnyError(ambiguousRowErrors)) {
      setRowErrors(ambiguousRowErrors);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Please select a District for every row before saving.",
      });
      return;
    }

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

    // District field for a City/area that resolves to more than one
    // district/state (task item 7, nationwide) - render as a picker the
    // user must choose from, instead of the usual read-only text field.
    if (field.autoFillDependent && field.name === "District") {
      const districtMatches = lookupDistrictForCity(row.City);
      if (districtMatches.length > 1) {
        // The row only stores plain District/State strings, so rebuild the
        // "District — State" option label from them to find which (if any)
        // of the current matches is already selected - keeps the Select
        // controlled without needing a separate field on the row.
        const currentOptionLabel = row.District && row.State ? `${row.District} — ${row.State}` : "";
        const selectValue = districtMatches.some(
          (m) => `${m.district} — ${m.state}` === currentOptionLabel
        )
          ? currentOptionLabel
          : "";

        return (
          <Grid item xs={12} sm={6} key={field.name}>
            <TextField
              select
              fullWidth
              label={field.label}
              value={selectValue}
              error={Boolean(fieldError)}
              helperText={fieldError || "This city exists in more than one district - pick one."}
              onChange={(e) => {
                const match = districtMatches.find(
                  (m) => `${m.district} — ${m.state}` === e.target.value
                );
                if (match) handleDistrictOptionSelect(rowIndex, match);
              }}
            >
              {districtMatches.map((m) => {
                const optionLabel = `${m.district} — ${m.state}`;
                return (
                  <MenuItem key={optionLabel} value={optionLabel}>
                    {optionLabel}
                  </MenuItem>
                );
              })}
            </TextField>
          </Grid>
        );
      }
    }

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
