import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Divider,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import * as userService from "../../services/userService";
import * as moduleService from "../../services/moduleService";
import { MODULE_KEYS, MODULE_LABELS } from "../../constants/modules";
import { DEFAULT_NEW_USER_PASSWORD } from "../../constants/userDefaults";

const MODULE_LIST = Object.values(MODULE_KEYS);

// Combined Add/Edit User page with the per-module View/Add/Edit permission
// matrix and per-location (Settings & Hierarchy) permission list (task
// item 4). Kept as one page rather than splitting user details and
// permissions across separate screens, since an admin virtually always
// sets both together when onboarding a user.
const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [roles, setRoles] = useState([]);
  const [plants, setPlants] = useState([]);
  const [formData, setFormData] = useState({
    FullName: "",
    Email: "",
    MobileNo: "",
    RoleID: "",
    // Task item 15: defaults to a standard temporary password, still
    // editable by the admin before saving.
    Password: DEFAULT_NEW_USER_PASSWORD,
  });
  const [modulePermissions, setModulePermissions] = useState(
    MODULE_LIST.reduce((acc, key) => ({ ...acc, [key]: { canView: false, canAdd: false, canEdit: false } }), {})
  );
  const [locationPlantIds, setLocationPlantIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, plantsRes] = await Promise.all([
          userService.listRoles(),
          // Bug fix (task item 16): explicitly request a high pageSize so
          // this list isn't silently truncated to the default page size
          // (10) when there are more plants than that - the previous
          // unqualified call could look "empty" once scrolled/filtered
          // past the first page, since this UI has no pagination of its
          // own for the plant checklist.
          moduleService.getRecords({ apiGroup: "masters", moduleName: "plants", params: { pageSize: 1000 } }),
        ]);
        setRoles(rolesRes.data.data || []);
        setPlants(plantsRes.data?.data || []);

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
            Password: "",
          });

          const permissions = permissionsRes.data.data;
          const nextModulePermissions = {};
          MODULE_LIST.forEach((key) => {
            const p = permissions.modulePermissions?.[key];
            nextModulePermissions[key] = {
              canView: Boolean(p?.CanView),
              canAdd: Boolean(p?.CanAdd),
              canEdit: Boolean(p?.CanEdit),
            };
          });
          setModulePermissions(nextModulePermissions);
          setLocationPlantIds(
            (permissions.locationPermissions || []).map((p) => p.PlantID)
          );
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

  const handlePermissionToggle = (moduleKey, action) => {
    setModulePermissions((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] },
    }));
  };

  const handleLocationToggle = (plantId) => {
    setLocationPlantIds((prev) =>
      prev.includes(plantId) ? prev.filter((id_) => id_ !== plantId) : [...prev, plantId]
    );
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

      const permissionsPayload = MODULE_LIST.map((key) => ({
        moduleKey: key,
        canView: modulePermissions[key].canView,
        canAdd: modulePermissions[key].canAdd,
        canEdit: modulePermissions[key].canEdit,
      }));
      await userService.updateUserModulePermissions(userId, permissionsPayload);
      await userService.updateUserLocationPermissions(userId, locationPlantIds);

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
    <Box p={3} component="form" onSubmit={handleSubmit}>
      <PageHeader
        title={`${isEdit ? "Edit" : "Add"} User`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "User Master", path: "/admin/users" },
          { label: isEdit ? "Edit" : "Add" },
        ]}
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>User Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              required
              value={formData.FullName}
              onChange={(e) => handleChange("FullName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              required
              value={formData.Email}
              onChange={(e) => handleChange("Email", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Mobile No"
              value={formData.MobileNo}
              onChange={(e) => handleChange("MobileNo", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Role"
              required
              value={formData.RoleID}
              onChange={(e) => handleChange("RoleID", e.target.value)}
            >
              {roles.map((role) => (
                <MenuItem key={role.RoleID} value={role.RoleID}>
                  {role.RoleName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {!isEdit && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="Temporary Password"
                helperText="Leave blank to auto-generate a random password."
                value={formData.Password}
                onChange={(e) => handleChange("Password", e.target.value)}
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Module Permissions</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Control which masters and actions this user can access.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Module</TableCell>
              <TableCell align="center">View</TableCell>
              <TableCell align="center">Add</TableCell>
              <TableCell align="center">Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MODULE_LIST.map((key) => (
              <TableRow key={key}>
                <TableCell>{MODULE_LABELS[key]}</TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={modulePermissions[key].canView}
                    onChange={() => handlePermissionToggle(key, "canView")}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={modulePermissions[key].canAdd}
                    onChange={() => handlePermissionToggle(key, "canAdd")}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={modulePermissions[key].canEdit}
                    onChange={() => handlePermissionToggle(key, "canEdit")}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Settings &amp; Hierarchy Access</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Which plants/locations this user may view or select as a default plant.
        </Typography>
        <Grid container spacing={1}>
          {plants.map((plant) => (
            <Grid item xs={12} sm={6} md={4} key={plant.PlantID}>
              <Checkbox
                checked={locationPlantIds.includes(plant.PlantID)}
                onChange={() => handleLocationToggle(plant.PlantID)}
              />
              {plant.PlantName || plant.PlantCode}
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Box display="flex" gap={2}>
        <Button type="submit" variant="contained" startIcon={<Save />} disabled={saving}>
          {isEdit ? "Save Changes" : "Create User"}
        </Button>
        <Button variant="outlined" onClick={() => navigate("/admin/users")}>
          Cancel
        </Button>
      </Box>

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
