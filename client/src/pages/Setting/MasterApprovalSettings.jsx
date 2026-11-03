import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { Save, Undo, InfoOutlined } from "@mui/icons-material";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import ModuleIcon from "../../components/common/ModuleIcon";
import ApproverPicker from "../../components/masterApproval/ApproverPicker";
import usePermissions from "../../hooks/usePermissions";
import { getMasterApprovalSettings, saveMasterApprovalSettings } from "../../services/masterApprovalService";

const idsOf = (users) => (users || []).map((user) => Number(user.UserID));

const toEditable = (module) => ({
  moduleKey: module.moduleKey,
  label: module.label,
  addEnabled: module.addEnabled,
  editEnabled: module.editEnabled,
  sameApprovers: module.sameApprovers,
  addApproverIds: idsOf(module.addApprovers),
  editApproverIds: idsOf(module.editApprovers),
});

const MISSING_APPROVER = "Choose at least one approver.";

// One approver list for both actions only matters when both need approval.
const usesSharedApprovers = (module) => module.addEnabled && module.editEnabled && module.sameApprovers;

const effectiveEditApproverIds = (module) => (usesSharedApprovers(module) ? module.addApproverIds : module.editApproverIds);

// Errors per module: { add, edit } messages for enabled actions without approvers.
const validateModule = (module) => ({
  add: module.addEnabled && !module.addApproverIds.length ? MISSING_APPROVER : "",
  edit: module.editEnabled && !effectiveEditApproverIds(module).length ? MISSING_APPROVER : "",
});

const toSavePayload = (module) => ({
  ...module,
  sameApprovers: usesSharedApprovers(module),
  editApproverIds: effectiveEditApproverIds(module),
});

const describeState = (module) => {
  const actions = [module.addEnabled && "Add", module.editEnabled && "Edit"].filter(Boolean);
  return actions.length
    ? { label: `Approval on ${actions.join(" & ")}`, color: "success" }
    : { label: "Saves directly", color: "default" };
};

const ActionSwitch = ({ checked, onChange, title, subtitle }) => (
  <Paper
    variant="outlined"
    sx={{
      flex: 1,
      px: 2,
      py: 1.25,
      borderRadius: 2,
      borderColor: checked ? "success.main" : "divider",
      bgcolor: checked ? "rgba(22,163,74,0.06)" : "transparent",
      transition: "all .2s",
    }}
  >
    <FormControlLabel
      sx={{ m: 0, width: "100%", justifyContent: "space-between" }}
      labelPlacement="start"
      control={<Switch checked={checked} color="success" onChange={(e) => onChange(e.target.checked)} />}
      label={
        <Box>
          <Typography variant="body2" fontWeight={700}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      }
    />
  </Paper>
);

const ModuleApprovalCard = ({ module, users, errors, onChange }) => {
  const state = describeState(module);
  const anyEnabled = module.addEnabled || module.editEnabled;
  const update = (changes) => onChange({ ...module, ...changes });

  // Unticking starts the Edit list from the shared list.
  const handleSameToggle = (sameApprovers) =>
    update({ sameApprovers, editApproverIds: sameApprovers ? module.editApproverIds : module.addApproverIds });

  const handleSharedApprovers = (ids) => update({ addApproverIds: ids, editApproverIds: ids });

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: anyEnabled ? "primary.light" : "divider",
        boxShadow: anyEnabled ? "0 6px 20px rgba(30,58,138,0.08)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: anyEnabled ? "primary.main" : "grey.300", color: anyEnabled ? "#fff" : "text.secondary" }}>
          <ModuleIcon moduleKey={module.moduleKey} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>{module.label}</Typography>
          <Typography variant="caption" color="text.secondary">Add new records and edit existing ones</Typography>
        </Box>
        <Chip size="small" label={state.label} color={state.color} variant={anyEnabled ? "filled" : "outlined"} />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <ActionSwitch
          checked={module.addEnabled}
          onChange={(addEnabled) => update({ addEnabled })}
          title="Approval on Add"
          subtitle="New records, incl. bulk upload"
        />
        <ActionSwitch
          checked={module.editEnabled}
          onChange={(editEnabled) => update({ editEnabled })}
          title="Approval on Edit"
          subtitle="Changes to existing records"
        />
      </Stack>

      {anyEnabled && (
        <>
          <Divider />
          {module.addEnabled && module.editEnabled && (
            <FormControlLabel
              sx={{ mt: -1 }}
              control={<Checkbox checked={module.sameApprovers} onChange={(e) => handleSameToggle(e.target.checked)} />}
              label={<Typography variant="body2">Same approver(s) for Add and Edit</Typography>}
            />
          )}

          {usesSharedApprovers(module) ? (
            <ApproverPicker
              label="Approvers for Add & Edit"
              users={users}
              value={module.addApproverIds}
              onChange={handleSharedApprovers}
              error={errors.add || errors.edit}
            />
          ) : (
            <Stack spacing={0.5}>
              {module.addEnabled && (
                <ApproverPicker
                  label="Approvers for Add"
                  users={users}
                  value={module.addApproverIds}
                  onChange={(addApproverIds) => update({ addApproverIds })}
                  error={errors.add}
                />
              )}
              {module.editEnabled && (
                <ApproverPicker
                  label="Approvers for Edit"
                  users={users}
                  value={module.editApproverIds}
                  onChange={(editApproverIds) => update({ editApproverIds })}
                  error={errors.edit}
                />
              )}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
};

export default function MasterApprovalSettings() {
  const { loaded, isAdmin } = usePermissions();
  if (!loaded) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <MasterApprovalSettingsPage />;
}

// Admin decides, per master, whether an Add and / or an Edit waits for
// approval, and which users approve it.
function MasterApprovalSettingsPage() {
  const [savedModules, setSavedModules] = useState([]);
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const notify = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const applySettings = (moduleList) => {
    const editable = moduleList.map(toEditable);
    setSavedModules(editable);
    setModules(editable);
  };

  useEffect(() => {
    getMasterApprovalSettings()
      .then((data) => {
        applySettings(data?.modules || []);
        setUsers(data?.users || []);
      })
      .catch((error) => notify(error?.response?.data?.message || "Failed to load the master approval workflow.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = useMemo(() => JSON.stringify(modules) !== JSON.stringify(savedModules), [modules, savedModules]);
  const errorsByModule = useMemo(() => Object.fromEntries(modules.map((module) => [module.moduleKey, validateModule(module)])), [modules]);
  const hasErrors = Object.values(errorsByModule).some((errors) => errors.add || errors.edit);
  const enabledCount = modules.filter((module) => module.addEnabled || module.editEnabled).length;

  const handleModuleChange = (nextModule) =>
    setModules((prev) => prev.map((module) => (module.moduleKey === nextModule.moduleKey ? nextModule : module)));

  const handleSave = async () => {
    if (hasErrors) {
      setShowErrors(true);
      notify("Every action that needs approval must have at least one approver.", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await saveMasterApprovalSettings(modules.map(toSavePayload));
      applySettings(response.data?.data || []);
      setShowErrors(false);
      notify(response.data?.message || "Master approval workflow saved.");
    } catch (error) {
      notify(error?.response?.data?.message || "Failed to save the master approval workflow.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader
        title="Master Approval Workflow"
        subtitle="Choose which master changes wait for approval before they are saved, and who approves them."
        breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Master Approval Workflow" }]}
      />

      <Alert icon={<InfoOutlined />} severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        When approval is on, an Add or Edit is saved only after <strong>any one</strong> of its approvers approves it.
        The person who made the change cannot approve it. Changes made by an Admin, or by the only approver, are saved directly.
        Approvers get a notification and an email, and act on it from <strong>Master Approvals</strong>.
      </Alert>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="subtitle2" color="text.secondary">
          {enabledCount} of {modules.length} masters need approval
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        {modules.map((module) => (
          <ModuleApprovalCard
            key={module.moduleKey}
            module={module}
            users={users}
            errors={showErrors ? errorsByModule[module.moduleKey] : {}}
            onChange={handleModuleChange}
          />
        ))}
      </Box>

      <Paper
        elevation={6}
        sx={{
          position: "sticky",
          bottom: 16,
          mt: 3,
          px: 2.5,
          py: 1.5,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          zIndex: 2,
        }}
      >
        <Typography variant="body2" color={isDirty ? "warning.main" : "text.secondary"} fontWeight={600}>
          {isDirty ? "You have unsaved changes." : "All changes are saved."}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Undo />} disabled={!isDirty || saving} onClick={() => { setModules(savedModules); setShowErrors(false); }} sx={{ textTransform: "none" }}>
            Discard
          </Button>
          <Button variant="contained" startIcon={<Save />} disabled={!isDirty || saving} onClick={handleSave} sx={{ textTransform: "none", fontWeight: 600 }}>
            {saving ? "Saving..." : "Save workflow"}
          </Button>
        </Stack>
      </Paper>

      <LoadingOverlay open={loading} message="Loading master approval workflow..." />
      <AppSnackbar open={snackbar.open} severity={snackbar.severity} message={snackbar.message} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />
    </Box>
  );
}
