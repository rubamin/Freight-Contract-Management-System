import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import * as databaseMaintenanceService from "../../services/databaseMaintenanceService";
import {
  MAINTENANCE_ACTIONS,
  MAINTENANCE_ACTION_OPTIONS,
} from "../../constants/databaseMaintenance";

const getErrorMessage = (err, fallback) => err.response?.data?.message || fallback;

const ModuleTableSummary = ({ module, action }) => (
  <Box sx={{ mt: 1 }}>
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {module.tables.map((table) => (
        <Chip key={table.table} size="small" label={`${table.table}: ${table.rowCount}`} />
      ))}
    </Stack>
    {module.preservedAdminCount > 0 && (
      <Alert severity="info" sx={{ mt: 1.5 }}>
        {module.preservedAdminCount} Admin account(s) and their settings are always kept.
      </Alert>
    )}
    {module.blockers.length > 0 && (
      <Alert severity="warning" sx={{ mt: 1.5 }}>
        {action === MAINTENANCE_ACTIONS.TRUNCATE
          ? "Truncating this module will also clear these dependent modules first:"
          : "Other data still uses this module. Clear these first:"}
        {action === MAINTENANCE_ACTIONS.TRUNCATE &&
          module.truncateDependencies.map((dependency) => (
            <Typography key={dependency.key} variant="body2">
              • {dependency.label}
            </Typography>
          ))}
        {module.blockers.map((b) => (
          <Typography key={`${b.table}.${b.column}`} variant="body2">
            • {b.module} ({b.table}.{b.column}: {b.rowCount} rows)
          </Typography>
        ))}
      </Alert>
    )}
    {action === MAINTENANCE_ACTIONS.TRUNCATE && module.truncateUnavailableReason && (
      <Alert severity="error" sx={{ mt: 1.5 }}>
        {module.truncateUnavailableReason}
      </Alert>
    )}
  </Box>
);

export default function UpdateDatabaseDialog({ open, onClose }) {
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [moduleKey, setModuleKey] = useState("");
  const [action, setAction] = useState(MAINTENANCE_ACTIONS.DELETE);
  const [confirmation, setConfirmation] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const res = await databaseMaintenanceService.getMaintenanceModules();
      setModules(res.data.data || []);
    } catch (err) {
      setResult({ severity: "error", message: getErrorMessage(err, "Failed to load modules.") });
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    if (open) loadModules();
  }, [open]);

  const resetForm = () => {
    setModuleKey("");
    setAction(MAINTENANCE_ACTIONS.DELETE);
    setConfirmation("");
    setResult(null);
  };

  const handleClose = () => {
    if (running) return;
    resetForm();
    onClose();
  };

  const selectedModule = modules.find((m) => m.key === moduleKey);
  const confirmationWord = action.toUpperCase();
  const actionUnavailable =
    selectedModule &&
    (action === MAINTENANCE_ACTIONS.TRUNCATE
      ? Boolean(selectedModule.truncateUnavailableReason)
      : selectedModule.blockers.length > 0);
  const canRun =
    selectedModule &&
    !actionUnavailable &&
    confirmation.trim().toUpperCase() === confirmationWord &&
    !running;

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await databaseMaintenanceService.runMaintenance({ moduleKey, action, confirmation });
      setResult({ severity: "success", message: res.data.message });
      setConfirmation("");
      await loadModules();
    } catch (err) {
      setResult({ severity: "error", message: getErrorMessage(err, "Database update failed.") });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <StorageIcon color="error" /> Update Database
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="error" sx={{ mb: 2 }}>
          This permanently removes data and cannot be undone. Take a database backup first.
        </Alert>

        <TextField
          select
          fullWidth
          label="Module"
          value={moduleKey}
          onChange={(e) => {
            setModuleKey(e.target.value);
            setConfirmation("");
            setResult(null);
          }}
          disabled={loadingModules || running}
          helperText={loadingModules ? "Loading modules..." : " "}
        >
          {modules.map((m) => (
            <MenuItem key={m.key} value={m.key}>
              {m.label} ({m.totalRows} rows)
            </MenuItem>
          ))}
        </TextField>

        {selectedModule && <ModuleTableSummary module={selectedModule} action={action} />}

        <RadioGroup
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setConfirmation("");
          }}
          sx={{ mt: 2 }}
        >
          {MAINTENANCE_ACTION_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio color="error" />}
              disabled={running}
              label={
                <Box>
                  <Typography fontWeight={600}>{option.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start", mb: 1, "& .MuiRadio-root": { pt: 0.5 } }}
            />
          ))}
        </RadioGroup>

        <TextField
          fullWidth
          label={`Type ${confirmationWord} to confirm`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={!selectedModule || running}
          sx={{ mt: 1 }}
        />

        {result && (
          <Alert severity={result.severity} sx={{ mt: 2 }}>
            {result.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={handleClose} disabled={running}>
          Close
        </Button>
        <Button variant="contained" color="error" onClick={handleRun} disabled={!canRun}>
          {running ? <CircularProgress size={20} color="inherit" /> : `Run ${confirmationWord}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
