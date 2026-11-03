import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Save, Person, Security, AccountTree } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import ModulePermissionMatrix from "../../components/users/ModulePermissionMatrix";
import LocationAccessMatrix from "../../components/users/LocationAccessMatrix";
import api from "../../services/api";
import * as userService from "../../services/userService";
import { MODULE_KEYS } from "../../constants/modules";
import { NO_ACCESS } from "../../utils/accessMatrix";

const MODULE_LIST = Object.values(MODULE_KEYS);
const EMPTY_HIERARCHY = { companies: [], sbus: [], plants: [], locations: [] };
const EMPTY_MODULE_PERMISSIONS = MODULE_LIST.reduce((acc, key) => ({ ...acc, [key]: { ...NO_ACCESS } }), {});

const toFlags = (row) => ({ canView: Boolean(row?.CanView), canAdd: Boolean(row?.CanAdd), canEdit: Boolean(row?.CanEdit) });

const toModuleState = (modulePermissions) =>
  MODULE_LIST.reduce((acc, key) => ({ ...acc, [key]: toFlags(modulePermissions?.[key]) }), {});

// Resolved location access (legacy plant grants included) keyed by LocationID.
const toLocationState = (locationAccess) =>
  (locationAccess || []).reduce((acc, row) => ({ ...acc, [String(row.LocationID)]: toFlags(row) }), {});

const toLocationPayload = (locationGrants) =>
  Object.entries(locationGrants)
    .filter(([, flags]) => flags.canView || flags.canAdd || flags.canEdit)
    .map(([locationId, flags]) => ({ locationId: Number(locationId), ...flags }));

const Section = ({ icon, title, subtitle, children }) => (
  <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
      <Avatar sx={{ bgcolor: "rgba(30,58,138,0.1)", color: "primary.main" }}>{icon}</Avatar>
      <Box>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
    {children}
  </Paper>
);

// Combined Add/Edit User page: user details, the per-module View/Add/Edit
// matrix, and the Settings & Hierarchy Access matrix (View/Add/Edit of
// the invoices of each location). Kept as one page since an admin
// virtually always sets all three together when onboarding a user.
const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [roles, setRoles] = useState([]);
  const [hierarchy, setHierarchy] = useState(EMPTY_HIERARCHY);
  const [formData, setFormData] = useState({
    FullName: "",
    Email: "",
    MobileNo: "",
    RoleID: "",
  });
  const [modulePermissions, setModulePermissions] = useState(EMPTY_MODULE_PERMISSIONS);
  const [locationGrants, setLocationGrants] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, hierarchyRes] = await Promise.all([userService.listRoles(), api.get("/settings/metadata")]);
        setRoles(rolesRes.data.data || []);
        setHierarchy({ ...EMPTY_HIERARCHY, ...(hierarchyRes.data?.data || {}) });

        if (isEdit) {
          const [userRes, permissionsRes] = await Promise.all([
            userService.getUserById(id),
            userService.getUserPermissions(id),
          ]);
          const user = userRes.data.data;
          setFormData({
            FullName: user.FullName || "",
            Email: user.Email || "",
            MobileNo: user.MobileNo || "",
            RoleID: user.RoleID || "",
          });

          const permissions = permissionsRes.data.data;
          setModulePermissions(toModuleState(permissions.modulePermissions));
          setLocationGrants(toLocationState(permissions.locationAccess));
        }
      } catch (err) {
        setSnackbar({
          open: true,
          severity: "error",
          message: err.response?.data?.message || "Failed to load user data.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      let userId = id;
      if (isEdit) {
        await userService.updateUser(id, formData);
      } else {
        const created = await userService.createUser(formData);
        userId = created.data.data.UserID;
      }

      const permissionsPayload = MODULE_LIST.map((key) => ({ moduleKey: key, ...modulePermissions[key] }));
      await userService.updateUserModulePermissions(userId, permissionsPayload);
      await userService.updateUserLocationPermissions(userId, toLocationPayload(locationGrants));

      setSnackbar({
        open: true,
        severity: "success",
        message: `User ${isEdit ? "updated" : "created"} successfully.`,
      });
      navigate("/admin/users");
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || err.response?.data?.errors?.join(", ") || "Failed to save user.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingOverlay open message="Loading..." />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ pb: 10 }}>
      <PageHeader
        title={`${isEdit ? "Edit" : "Add"} User`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "User Master", path: "/admin/users" },
          { label: isEdit ? "Edit" : "Add" },
        ]}
      />

      <Section icon={<Person />} title="User Details" subtitle="Login details and role of the user.">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField fullWidth label="Full Name" required value={formData.FullName} onChange={(e) => handleChange("FullName", e.target.value)} />
          <TextField fullWidth label="Email" type="email" required value={formData.Email} onChange={(e) => handleChange("Email", e.target.value)} />
          <TextField fullWidth label="Mobile No" value={formData.MobileNo} onChange={(e) => handleChange("MobileNo", e.target.value)} />
          <TextField select fullWidth label="Role" required value={formData.RoleID} onChange={(e) => handleChange("RoleID", e.target.value)}>
            {roles.map((role) => (
              <MenuItem key={role.RoleID} value={role.RoleID}>
                {role.RoleName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {!isEdit && (
          <Alert severity="info" sx={{ mt: 2 }}>
            The Email is the login ID. A temporary password is generated and emailed to it; the user sets their
            own password at first sign-in. If the email can&apos;t be sent, the user is not created.
          </Alert>
        )}
      </Section>

      <Section icon={<Security />} title="Module Permissions" subtitle="Which modules this user sees, and whether they can add or edit in them. Add or Edit always includes View.">
        <ModulePermissionMatrix moduleKeys={MODULE_LIST} value={modulePermissions} onChange={setModulePermissions} />
      </Section>

      <Section
        icon={<AccountTree />}
        title="Settings & Hierarchy Access"
        subtitle="Locations whose invoices this user can view, add and edit. Invoices of any other location are not shown and cannot be added or edited. Admins always have every location."
      >
        <LocationAccessMatrix hierarchy={hierarchy} value={locationGrants} onChange={setLocationGrants} />
      </Section>

      <Paper
        elevation={6}
        sx={{ position: "sticky", bottom: 16, px: 2.5, py: 1.5, borderRadius: 3, display: "flex", justifyContent: "flex-end", gap: 1.5, zIndex: 2 }}
      >
        <Button variant="outlined" onClick={() => navigate("/admin/users")} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" startIcon={<Save />} disabled={saving} sx={{ textTransform: "none", fontWeight: 600 }}>
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
        </Button>
      </Paper>

      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default UserForm;
