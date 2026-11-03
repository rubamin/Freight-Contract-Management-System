import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { HourglassTop, Send, TaskAlt, Cancel, Refresh, Search, Visibility } from "@mui/icons-material";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import SummaryCard from "../../components/common/SummaryCard";
import ModuleIcon from "../../components/common/ModuleIcon";
import MasterRequestStatusChip from "../../components/masterApproval/MasterRequestStatusChip";
import MasterActionChip from "../../components/masterApproval/MasterActionChip";
import MasterRequestDetailDialog from "../../components/masterApproval/MasterRequestDetailDialog";
import usePermissions from "../../hooks/usePermissions";
import { MODULE_LABELS } from "../../constants/modules";
import { MASTER_APPROVAL_MODULE_KEYS, MASTER_REQUEST_VIEWS } from "../../constants/masterApproval";
import { getMasterRequestSummary, getMasterRequests } from "../../services/masterApprovalService";
import { formatDateTimeDisplay } from "../../utils/dateFormat";

const ALL_MASTERS = "";
const EMPTY_SUMMARY = { waitingForMe: 0, myPending: 0, myApproved: 0, myRejected: 0 };

const EMPTY_TEXT = {
  [MASTER_REQUEST_VIEWS.WAITING]: "Nothing is waiting for your approval.",
  [MASTER_REQUEST_VIEWS.MINE]: "You have not sent any master change for approval yet.",
  [MASTER_REQUEST_VIEWS.ALL]: "No master change has been sent for approval yet.",
};

const HEADERS = ["Request #", "Master", "Action", "Record", "Requested by", "Requested on", "Status", "Decided by", ""];

const matchesSearch = (request, search) => {
  if (!search) return true;
  const text = [request.RequestID, request.RecordLabel, request.RequestedByName, request.ActedByName, MODULE_LABELS[request.ModuleKey]]
    .join(" ")
    .toLowerCase();
  return text.includes(search.toLowerCase());
};

export default function MasterApprovals() {
  const { loaded, canUseMasterApprovals, isMasterApprover, isAdmin } = usePermissions();
  if (!loaded) return null;
  if (!canUseMasterApprovals) return <Navigate to="/dashboard" replace />;
  return <MasterApprovalsPage isApprover={isMasterApprover} isAdmin={isAdmin} />;
}

// Master Add / Edit requests held for approval: the ones waiting for this
// user, the ones this user sent, and (Admin) every request.
function MasterApprovalsPage({ isApprover, isAdmin }) {
  const [view, setView] = useState(isApprover ? MASTER_REQUEST_VIEWS.WAITING : MASTER_REQUEST_VIEWS.MINE);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [masterFilter, setMasterFilter] = useState(ALL_MASTERS);
  const [openRequestId, setOpenRequestId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const notify = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, counts] = await Promise.all([getMasterRequests(view), getMasterRequestSummary()]);
      setRequests(list || []);
      setSummary(counts || EMPTY_SUMMARY);
    } catch (error) {
      notify(error?.response?.data?.message || "Failed to load master approvals.", "error");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleRequests = useMemo(
    () => requests.filter((request) => (!masterFilter || request.ModuleKey === masterFilter) && matchesSearch(request, search.trim())),
    [requests, masterFilter, search]
  );

  const handleDecided = (message) => {
    setOpenRequestId(null);
    notify(message);
    loadData();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <PageHeader
        title="Master Approvals"
        subtitle="Master records added or edited by users are saved only after approval. Review the changes, then approve or reject them."
        breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Master Approvals" }]}
      />

      <Box sx={{ display: "grid", gap: 2, mb: 3, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
        {isApprover && (
          <SummaryCard
            label="Waiting for me"
            value={summary.waitingForMe}
            icon={<HourglassTop />}
            color="warning"
            active={view === MASTER_REQUEST_VIEWS.WAITING}
            onClick={() => setView(MASTER_REQUEST_VIEWS.WAITING)}
          />
        )}
        <SummaryCard
          label="My pending requests"
          value={summary.myPending}
          icon={<Send />}
          color="info"
          active={view === MASTER_REQUEST_VIEWS.MINE}
          onClick={() => setView(MASTER_REQUEST_VIEWS.MINE)}
        />
        <SummaryCard label="My approved" value={summary.myApproved} icon={<TaskAlt />} color="success" />
        <SummaryCard label="My rejected" value={summary.myRejected} icon={<Cancel />} color="error" />
      </Box>

      <Paper sx={{ mb: 2, px: 2, py: 1, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
        <Tabs value={view} onChange={(e, value) => setView(value)}>
          {isApprover && <Tab value={MASTER_REQUEST_VIEWS.WAITING} label={`Waiting for me (${summary.waitingForMe})`} sx={{ textTransform: "none", fontWeight: 600 }} />}
          <Tab value={MASTER_REQUEST_VIEWS.MINE} label="My requests" sx={{ textTransform: "none", fontWeight: 600 }} />
          {isAdmin && <Tab value={MASTER_REQUEST_VIEWS.ALL} label="All requests" sx={{ textTransform: "none", fontWeight: 600 }} />}
        </Tabs>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <TextField
            size="small"
            placeholder="Search record, user, #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
          />
          <TextField select size="small" value={masterFilter} onChange={(e) => setMasterFilter(e.target.value)} sx={{ minWidth: 200 }} label="Master">
            <MenuItem value={ALL_MASTERS}>All masters</MenuItem>
            {MASTER_APPROVAL_MODULE_KEYS.map((moduleKey) => (
              <MenuItem key={moduleKey} value={moduleKey}>{MODULE_LABELS[moduleKey]}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadData} sx={{ textTransform: "none", height: 40 }}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: 3 }}>
        <TableContainer sx={{ maxHeight: 640 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {HEADERS.map((header) => (
                  <TableCell key={header} sx={{ fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#F8FAFC" }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={HEADERS.length} align="center" sx={{ py: 5 }}>Loading...</TableCell></TableRow>
              ) : visibleRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={HEADERS.length} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {requests.length ? "No request matches your search." : EMPTY_TEXT[view]}
                  </TableCell>
                </TableRow>
              ) : visibleRequests.map((request) => (
                <TableRow key={request.RequestID} hover sx={{ cursor: "pointer" }} onClick={() => setOpenRequestId(request.RequestID)}>
                  <TableCell sx={{ fontWeight: 700 }}>#{request.RequestID}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ModuleIcon moduleKey={request.ModuleKey} fontSize="small" color="primary" />
                      <Typography variant="body2" noWrap>{MODULE_LABELS[request.ModuleKey] || request.ModuleKey}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell><MasterActionChip actionType={request.ActionType} operation={request.Operation} /></TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" noWrap title={request.RecordLabel}>{request.RecordLabel || "-"}</Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{request.RequestedByName || request.RequestedByEmail}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTimeDisplay(request.RequestedAt)}</TableCell>
                  <TableCell><MasterRequestStatusChip status={request.Status} /></TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {request.ActedByName ? (
                      <Box>
                        <Typography variant="body2">{request.ActedByName}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDateTimeDisplay(request.ActedAt)}</Typography>
                      </Box>
                    ) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={view === MASTER_REQUEST_VIEWS.WAITING ? "Review & decide" : "View details"}>
                      <Button
                        size="small"
                        variant={view === MASTER_REQUEST_VIEWS.WAITING ? "contained" : "text"}
                        startIcon={<Visibility fontSize="small" />}
                        onClick={(e) => { e.stopPropagation(); setOpenRequestId(request.RequestID); }}
                        sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                      >
                        {view === MASTER_REQUEST_VIEWS.WAITING ? "Review" : "View"}
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <MasterRequestDetailDialog
        requestId={openRequestId}
        onClose={() => setOpenRequestId(null)}
        onDecided={handleDecided}
      />

      <AppSnackbar open={snackbar.open} severity={snackbar.severity} message={snackbar.message} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />
    </Box>
  );
}
