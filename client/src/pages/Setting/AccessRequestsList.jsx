import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Chip,
  Button,
  Typography,
} from "@mui/material";
import { CheckCircle, Cancel } from "@mui/icons-material";
import CustomDataGrid from "../../components/common/CustomDataGrid";
import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import * as accessRequestService from "../../services/accessRequestService";
import { MODULE_LABELS } from "../../constants/modules";

// Admin-facing queue for the generalized "Request Access" flow (task item
// 19/20). Approving a request grants the underlying permission
// server-side (see accessRequest.service.js) - this page only needs to
// show the queue and call resolve, not manage permissions itself.
const AccessRequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await accessRequestService.listPendingAccessRequests();
      setRequests(res.data.data || []);
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || "Failed to load access requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleResolve = async (id, decision) => {
    try {
      await accessRequestService.resolveAccessRequest(id, decision);
      setSnackbar({
        open: true,
        severity: "success",
        message: `Request ${decision.toLowerCase()} successfully.`,
      });
      loadRequests();
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || "Failed to resolve request.",
      });
    }
  };

  const describeRequest = (request) => {
    if (request.RequestType === "MODULE") {
      return `${request.RequestedAction?.toUpperCase()} access to ${MODULE_LABELS[request.ModuleKey] || request.ModuleKey}`;
    }
    return `Access to plant: ${request.plant?.PlantName || request.plant?.PlantCode || request.PlantID}`;
  };

  const columns = [
    {
      field: "user",
      headerName: "Requested By",
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => params.row.user?.FullName || params.row.user?.Email || "-",
    },
    {
      field: "request",
      headerName: "Requesting",
      flex: 1.5,
      minWidth: 240,
      valueGetter: (params) => describeRequest(params.row),
    },
    {
      field: "RequestType",
      headerName: "Type",
      width: 120,
      renderCell: (params) => <Chip label={params.value} size="small" />,
    },
    {
      field: "RequestedAt",
      headerName: "Requested At",
      width: 180,
      valueGetter: (params) => new Date(params.row.RequestedAt).toLocaleString(),
    },
    {
      field: "Action",
      headerName: "Action",
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => handleResolve(params.row.AccessRequestID, "APPROVED")}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={() => handleResolve(params.row.AccessRequestID, "REJECTED")}
          >
            Reject
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box p={3}>
      <PageHeader
        title="Access Requests"
        breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Access Requests" }]}
      />

      <Paper>
        {requests.length === 0 && !loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No pending access requests.</Typography>
          </Box>
        ) : (
          <CustomDataGrid
            rows={requests}
            columns={columns}
            getRowId={(row) => row.AccessRequestID}
            loading={loading}
            totalRecords={requests.length}
            page={0}
            pageSize={requests.length || 10}
            onPaginationModelChange={() => {}}
          />
        )}
      </Paper>

      <LoadingOverlay open={loading} message="Loading requests..." />

      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default AccessRequestsList;
