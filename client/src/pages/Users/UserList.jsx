import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
} from "@mui/material";
import { Edit, Search, ToggleOn, ToggleOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import AppSnackbar from "../../components/common/AppSnackbar";
import CustomDataGrid from "../../components/common/CustomDataGrid";
import useDebounce from "../../hooks/useDebounce";
import usePermissions from "../../hooks/usePermissions";
import * as userService from "../../services/userService";

const UserList = () => {
  const navigate = useNavigate();
  const { canEdit, loaded: permissionsLoaded } = usePermissions();

  const [users, setUsers] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const debouncedSearch = useDebounce(search, 500);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.listUsers({
        page: page + 1,
        pageSize,
        search: debouncedSearch,
      });
      setUsers(res.data.data || []);
      setTotalRecords(res.data.totalRecords || 0);
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || "Failed to load users.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  const handleToggleActive = async (user) => {
    try {
      await userService.setUserActive(user.UserID, !user.IsActive);
      setSnackbar({
        open: true,
        severity: "success",
        message: `User ${!user.IsActive ? "activated" : "deactivated"} successfully.`,
      });
      loadUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || "Failed to update user status.",
      });
    }
  };

  const columns = [
    {
      field: "Action",
      headerName: "Action",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <>
          {/* Bug fix (task item 17): Edit hidden, not just disabled, for
              users without User Master Edit permission. */}
          {permissionsLoaded && canEdit("users") && (
            <IconButton color="primary" onClick={() => navigate(`/admin/users/edit/${params.row.UserID}`)}>
              <Edit fontSize="small" />
            </IconButton>
          )}
          <IconButton 
            color={params.row.IsActive ? "error" : "success"} 
            onClick={() => handleToggleActive(params.row)}
            title={params.Row?.IsActive ? "Deactivate User" : "Activate User"}
          >
            {params.row.IsActive ? <ToggleOff fontSize="small" /> : <ToggleOn fontSize="small" />}
          </IconButton>
        </>
      ),
    },
    { field: "FullName", headerName: "Full Name", flex: 1, minWidth: 160 },
    { field: "Email", headerName: "Email", flex: 1, minWidth: 200 },
    { field: "MobileNo", headerName: "Mobile", flex: 1, minWidth: 140 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      minWidth: 140,
      valueGetter: (value, row) => row?.role?.RoleName || "-",
    },
    {
      field: "IsActive",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Inactive"}
          color={params.value ? "success" : "error"}
          size="small"
        />
      ),
    },
  ];

  return (
    <Box p={3}>
      <PageHeader
        title="User Master"
        breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "User Master" }]}
        buttonText="Add User"
        onButtonClick={() => navigate("/admin/users/add")}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper>
        <CustomDataGrid
          rows={users}
          columns={columns}
          getRowId={(row) => row.UserID}
          loading={loading}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
        />
      </Paper>

      <LoadingOverlay open={loading} message="Loading users..." />

      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default UserList;