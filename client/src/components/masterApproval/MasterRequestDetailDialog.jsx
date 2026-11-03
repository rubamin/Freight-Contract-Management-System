import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { CheckCircle, Cancel, Close, Download, Block } from "@mui/icons-material";

import ModuleIcon from "../common/ModuleIcon";
import MasterRequestStatusChip from "./MasterRequestStatusChip";
import MasterActionChip from "./MasterActionChip";
import { MODULE_LABELS } from "../../constants/modules";
import {
  MASTER_ACTIONS,
  MASTER_REQUEST_DECISIONS,
  MASTER_REQUEST_OPERATIONS,
  MASTER_REQUEST_STATUS,
  MAX_BULK_PREVIEW_ROWS,
  MAX_MASTER_REQUEST_REMARKS_LENGTH,
} from "../../constants/masterApproval";
import {
  approveMasterRequest,
  cancelMasterRequest,
  downloadMasterRequestFile,
  getMasterRequest,
  rejectMasterRequest,
} from "../../services/masterApprovalService";
import { buildChangeRows, formatRequestValue, getBulkColumns } from "../../utils/masterRequestFields";
import { formatDateTimeDisplay } from "../../utils/dateFormat";
import { triggerBlobDownload } from "../../utils/downloadFile";

const InfoItem = ({ label, children }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</Typography>
    <Box sx={{ fontSize: "0.875rem", fontWeight: 600, mt: 0.25 }}>{children || "-"}</Box>
  </Box>
);

const HEADER_CELL_SX = { fontWeight: 700, bgcolor: "#F8FAFC", whiteSpace: "nowrap" };

const ChangeTable = ({ request }) => {
  const rows = buildChangeRows(request.ActionType, request.payload, request.oldData);
  const isEdit = request.ActionType === MASTER_ACTIONS.EDIT;
  const changedCount = rows.filter((row) => row.changed).length;

  if (!rows.length) return <Alert severity="info">No field values were sent with this request.</Alert>;

  return (
    <>
      {isEdit && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {changedCount} field(s) changed - highlighted below.
        </Typography>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={HEADER_CELL_SX}>Field</TableCell>
              {isEdit && <TableCell sx={HEADER_CELL_SX}>Current</TableCell>}
              <TableCell sx={HEADER_CELL_SX}>{isEdit ? "Proposed" : "Value"}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} sx={row.changed ? { bgcolor: "rgba(245,158,11,0.08)" } : undefined}>
                <TableCell sx={{ fontWeight: 600, width: "28%" }}>{row.field}</TableCell>
                {isEdit && <TableCell sx={{ color: row.changed ? "text.secondary" : "text.primary", textDecoration: row.changed ? "line-through" : "none" }}>{row.current}</TableCell>}
                <TableCell sx={{ fontWeight: row.changed ? 700 : 400, color: row.changed ? "warning.dark" : "text.primary" }}>{row.proposed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

const BulkPreview = ({ rows }) => {
  const list = Array.isArray(rows) ? rows : [];
  const columns = getBulkColumns(list.slice(0, MAX_BULK_PREVIEW_ROWS));
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {list.length} row(s) in the uploaded file{list.length > MAX_BULK_PREVIEW_ROWS ? ` - first ${MAX_BULK_PREVIEW_ROWS} shown` : ""}.
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={HEADER_CELL_SX}>#</TableCell>
              {columns.map((column) => <TableCell key={column} sx={HEADER_CELL_SX}>{column}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {list.slice(0, MAX_BULK_PREVIEW_ROWS).map((row, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                {columns.map((column) => <TableCell key={column}>{formatRequestValue(row[column])}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

// Full details of one master change request, with approve / reject for
// approvers and cancel for the requester.
const MasterRequestDetailDialog = ({ requestId, onClose, onDecided }) => {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!requestId) return undefined;
    let isMounted = true;
    setRequest(null);
    setRemarks("");
    setActionError("");
    setLoadError("");
    setLoading(true);
    getMasterRequest(requestId)
      .then((data) => isMounted && setRequest(data))
      .catch((error) => isMounted && setLoadError(error?.response?.data?.message || "Failed to load this request."))
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const runAction = async (actionKey, action) => {
    setSubmitting(actionKey);
    setActionError("");
    try {
      const response = await action();
      onDecided(response.data?.message || "Done.");
    } catch (error) {
      setActionError(error?.response?.data?.message || "The action failed. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleApprove = () => runAction(MASTER_REQUEST_DECISIONS.APPROVE, () => approveMasterRequest(requestId, remarks.trim()));

  const handleReject = () => {
    if (!remarks.trim()) {
      setActionError("Enter the reason for rejecting - the requester sees it.");
      return;
    }
    runAction(MASTER_REQUEST_DECISIONS.REJECT, () => rejectMasterRequest(requestId, remarks.trim()));
  };

  const handleCancel = () => runAction("cancel", () => cancelMasterRequest(requestId));

  const handleDownload = async () => {
    try {
      const response = await downloadMasterRequestFile(requestId);
      triggerBlobDownload(new Blob([response.data]), request.FileName || `request-${requestId}`);
    } catch {
      setActionError("Failed to download the file.");
    }
  };

  const isBusy = Boolean(submitting);
  const isBulk = request?.Operation === MASTER_REQUEST_OPERATIONS.BULK;

  return (
    <Dialog open={Boolean(requestId)} onClose={() => !isBusy && onClose()} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pr: 6 }}>
        {request && (
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <ModuleIcon moduleKey={request.ModuleKey} />
          </Avatar>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Request #{requestId}{request ? ` - ${MODULE_LABELS[request.ModuleKey] || request.ModuleKey}` : ""}
          </Typography>
          {request?.RecordLabel && <Typography variant="body2" color="text.secondary">{request.RecordLabel}</Typography>}
        </Box>
        <IconButton onClick={onClose} disabled={isBusy} sx={{ position: "absolute", right: 12, top: 12 }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box>}
        {loadError && <Alert severity="error">{loadError}</Alert>}

        {request && (
          <Stack spacing={2.5}>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" } }}>
              <InfoItem label="Action"><MasterActionChip actionType={request.ActionType} operation={request.Operation} /></InfoItem>
              <InfoItem label="Status"><MasterRequestStatusChip status={request.Status} /></InfoItem>
              <InfoItem label="Requested by">{request.RequestedByName || request.RequestedByEmail}</InfoItem>
              <InfoItem label="Requested on">{formatDateTimeDisplay(request.RequestedAt)}</InfoItem>
              {request.ActedAt && <InfoItem label="Decided by">{request.ActedByName}</InfoItem>}
              {request.ActedAt && <InfoItem label="Decided on">{formatDateTimeDisplay(request.ActedAt)}</InfoItem>}
            </Box>

            {request.ActionRemarks && (
              <Alert severity={request.Status === MASTER_REQUEST_STATUS.REJECTED ? "error" : "info"} sx={{ borderRadius: 2 }}>
                <strong>Remarks:</strong> {request.ActionRemarks}
              </Alert>
            )}
            {request.ResultMessage && <Alert severity="success" sx={{ borderRadius: 2 }}>{request.ResultMessage}</Alert>}

            {request.hasFile && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="body2"><strong>Attached file:</strong> {request.FileName}</Typography>
                <Button size="small" startIcon={<Download />} onClick={handleDownload} sx={{ textTransform: "none" }}>Download</Button>
              </Paper>
            )}

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {isBulk ? "Rows to add" : request.ActionType === MASTER_ACTIONS.EDIT ? "Changes" : "New record"}
              </Typography>
              {isBulk ? <BulkPreview rows={request.payload} /> : <ChangeTable request={request} />}
            </Box>

            {request.approvers?.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Approvers</Typography>
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.75 }}>
                  {request.approvers.map((name) => <Chip key={name} size="small" label={name} variant="outlined" />)}
                </Stack>
              </Box>
            )}

            {request.canAct && (
              <>
                <Divider />
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Remarks (required to reject)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: MAX_MASTER_REQUEST_REMARKS_LENGTH } }}
                />
              </>
            )}

            {actionError && <Alert severity="error" sx={{ borderRadius: 2 }}>{actionError}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {request?.canCancel && (
          <Button color="inherit" startIcon={<Block />} onClick={handleCancel} disabled={isBusy} sx={{ textTransform: "none", mr: "auto" }}>
            {submitting === "cancel" ? "Cancelling..." : "Cancel my request"}
          </Button>
        )}
        <Button onClick={onClose} disabled={isBusy} sx={{ textTransform: "none" }}>Close</Button>
        {request?.canAct && (
          <>
            <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={handleReject} disabled={isBusy} sx={{ textTransform: "none", fontWeight: 600 }}>
              {submitting === MASTER_REQUEST_DECISIONS.REJECT ? "Rejecting..." : "Reject"}
            </Button>
            <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleApprove} disabled={isBusy} sx={{ textTransform: "none", fontWeight: 600 }}>
              {submitting === MASTER_REQUEST_DECISIONS.APPROVE ? "Approving..." : "Approve & save"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MasterRequestDetailDialog;
