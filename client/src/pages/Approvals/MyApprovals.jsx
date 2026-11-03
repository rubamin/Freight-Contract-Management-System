import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
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
import { CheckCircle, Cancel, History, Refresh } from "@mui/icons-material";
import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import ApprovalStatusChip from "../../components/approvalWorkflow/ApprovalStatusChip";
import InvoiceTimelineDialog from "../../components/approvalWorkflow/InvoiceTimelineDialog";
import { approveInvoice, getMyApprovalTasks, rejectInvoice } from "../../services/approvalWorkflowService";
import { MAX_ACTION_REMARKS_LENGTH, MY_APPROVALS_VIEWS, TASK_STATUS_LABELS } from "../../constants/approvalWorkflow";
import { getContractTypeLabel } from "../../constants/contractTypes";
import { formatDateDisplay, formatDateTimeDisplay } from "../../utils/dateFormat";
import { SERVER_ORIGIN } from "../../constants/appConfig";
import { Navigate } from "react-router-dom";
import usePermissions from "../../hooks/usePermissions";

const AUDIT_LABELS = { PRE_APPROVED: "Pre-Approved", APPROVED: "Approved", DISCREPANCY: "Discrepancy" };
const DECISIONS = { APPROVE: "approve", REJECT: "reject" };
const EMPTY_ACTION = { decision: null, tasks: [], remarks: "" };

const money = (value) => `₹${(parseFloat(value) || 0).toFixed(2)}`;

const DocumentLinks = ({ task }) => {
  const paths = [task.Doc1Path, task.Doc2Path, task.Doc3Path].filter(Boolean);
  if (!paths.length) return "-";
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      {paths.map((docPath) => (
        <Link key={docPath} href={`${SERVER_ORIGIN}/${docPath.replace(/\\/g, "/")}`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: "0.8rem" }}>
          {docPath.split(/[\\/]/).pop()}
        </Link>
      ))}
    </Box>
  );
};

// Only users assigned to an approval workflow step (and admins) can open
// My Approvals; everyone else is sent to the dashboard.
export default function MyApprovals() {
  const { loaded, canUseApprovals } = usePermissions();
  if (!loaded) return null;
  if (!canUseApprovals) return <Navigate to="/dashboard" replace />;
  return <MyApprovalsPage />;
}

// Invoices waiting for the logged-in user's approval, and what they acted on.
function MyApprovalsPage() {
  const [view, setView] = useState(MY_APPROVALS_VIEWS.PENDING);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [action, setAction] = useState(EMPTY_ACTION);
  const [submitting, setSubmitting] = useState(false);
  const [timelineInvoice, setTimelineInvoice] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const isPending = view === MY_APPROVALS_VIEWS.PENDING;
  const notify = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await getMyApprovalTasks(view) || []);
      setSelectedIds([]);
    } catch (error) {
      notify(error?.response?.data?.message || "Failed to load your approvals.", "error");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const toggleSelected = (taskId) => {
    setSelectedIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const openAction = (decision, selectedTasks) => setAction({ decision, tasks: selectedTasks, remarks: "" });

  // Acts on each invoice in turn; a failure on one does not stop the rest.
  const handleConfirmAction = async () => {
    const isReject = action.decision === DECISIONS.REJECT;
    if (isReject && !action.remarks.trim()) {
      notify("Enter the reason for rejecting.", "error");
      return;
    }
    setSubmitting(true);
    const messages = [];
    let failed = 0;
    for (const task of action.tasks) {
      try {
        const response = await (isReject ? rejectInvoice : approveInvoice)(task.InvoiceID, action.remarks.trim());
        messages.push(response.data?.message);
      } catch (error) {
        failed += 1;
        messages.push(`${task.InvoiceNumber}: ${error?.response?.data?.message || "failed"}`);
      }
    }
    setSubmitting(false);
    setAction(EMPTY_ACTION);
    notify(messages.filter(Boolean).join(" "), failed ? "warning" : "success");
    loadTasks();
  };

  const selectedTasks = tasks.filter((task) => selectedIds.includes(task.TaskID));

  return (
    <Box p={3} sx={{ width: "100%" }}>
      <PageHeader
        title="Invoices Approvals"
        subtitle="Invoices waiting for your approval. Approve to send them to the next step, or reject with a reason so the uploader can correct them."
        breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Invoices Approvals" }]}
      />

      <Paper sx={{ mb: 2, px: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Tabs value={view} onChange={(e, value) => setView(value)}>
          <Tab value={MY_APPROVALS_VIEWS.PENDING} label="Waiting for me" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab value={MY_APPROVALS_VIEWS.HISTORY} label="Approved / rejected / shared" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>
        <Box sx={{ display: "flex", gap: 1 }}>
          {isPending && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircle />}
              disabled={!selectedTasks.length}
              onClick={() => openAction(DECISIONS.APPROVE, selectedTasks)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Approve selected ({selectedTasks.length})
            </Button>
          )}
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadTasks} sx={{ textTransform: "none" }}>
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 640 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {isPending && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={tasks.length > 0 && selectedIds.length === tasks.length}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < tasks.length}
                      onChange={(e) => setSelectedIds(e.target.checked ? tasks.map((task) => task.TaskID) : [])}
                    />
                  </TableCell>
                )}
                {["Invoice No", "Invoice Date", "Type", "Vendor", "Location", "Route", "LR No", "SO No", "Billed", "Contract Price", "Audit", "System Remarks", "User Remarks", "Entered by", "Step", isPending ? "Waiting since" : "Result", "Documents", "Actions"].map((header) => (
                  <TableCell key={header} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={19} align="center" sx={{ py: 4 }}>Loading...</TableCell></TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {isPending ? "Nothing is waiting for your approval." : "You have not approved, rejected or received any invoice yet."}
                  </TableCell>
                </TableRow>
              ) : tasks.map((task) => (
                <TableRow key={task.TaskID} hover selected={selectedIds.includes(task.TaskID)}>
                  {isPending && (
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedIds.includes(task.TaskID)} onChange={() => toggleSelected(task.TaskID)} />
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600 }}>{task.InvoiceNumber}</TableCell>
                  <TableCell>{formatDateDisplay(task.InvoiceDate)}</TableCell>
                  <TableCell>{getContractTypeLabel(task.ContractType)}</TableCell>
                  <TableCell>{task.VendorName || "-"}</TableCell>
                  <TableCell>{task.LocationName || "-"}</TableCell>
                  <TableCell>{task.FromStation || "-"} → {task.ToStation || "-"}</TableCell>
                  <TableCell>{task.LRNumber || "-"}</TableCell>
                  <TableCell>{task.SONumber || "-"}</TableCell>
                  <TableCell>{money(task.TotalInvoiceAmount)}</TableCell>
                  <TableCell>{money(task.ExpectedAmount)}</TableCell>
                  <TableCell>{AUDIT_LABELS[task.VerificationStatus] || task.VerificationStatus || "-"}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" title={task.Remarks}>{task.Remarks || "-"}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap title={task.UserRemarks}>{task.UserRemarks || "-"}</Typography></TableCell>
                  <TableCell>{task.UploadedByName || "-"}</TableCell>
                  <TableCell>{task.StepOrder}. {task.StepName}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {isPending ? formatDateTimeDisplay(task.AssignedAt) : (
                      <Box>
                        <Typography variant="body2">{TASK_STATUS_LABELS[task.TaskStatus] || task.TaskStatus}, {formatDateTimeDisplay(task.ActedAt)}</Typography>
                        <ApprovalStatusChip status={task.ApprovalStatus} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell><DocumentLinks task={task} /></TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {isPending && (
                      <>
                        <Tooltip title="Approve"><IconButton color="success" size="small" onClick={() => openAction(DECISIONS.APPROVE, [task])}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Reject"><IconButton color="error" size="small" onClick={() => openAction(DECISIONS.REJECT, [task])}><Cancel fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                    <Tooltip title="Approval history"><IconButton size="small" onClick={() => setTimelineInvoice(task)}><History fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={Boolean(action.decision)} onClose={() => !submitting && setAction(EMPTY_ACTION)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {action.decision === DECISIONS.REJECT ? "Reject" : "Approve"} {action.tasks.length === 1 ? `invoice ${action.tasks[0].InvoiceNumber}` : `${action.tasks.length} invoices`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {action.decision === DECISIONS.REJECT
              ? "The uploader receives this reason by mail. They can edit the invoice and save it to send it for approval again."
              : "Approved invoices move to the next step of the workflow, or are marked Approved if this is the last approval step."}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={action.decision === DECISIONS.REJECT ? "Reason *" : "Remarks (optional)"}
            value={action.remarks}
            onChange={(e) => setAction((prev) => ({ ...prev, remarks: e.target.value }))}
            slotProps={{ htmlInput: { maxLength: MAX_ACTION_REMARKS_LENGTH } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(EMPTY_ACTION)} disabled={submitting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            color={action.decision === DECISIONS.REJECT ? "error" : "success"}
            onClick={handleConfirmAction}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {submitting ? "Saving..." : action.decision === DECISIONS.REJECT ? "Reject" : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      <InvoiceTimelineDialog
        invoiceId={timelineInvoice?.InvoiceID}
        invoiceNumber={timelineInvoice?.InvoiceNumber}
        onClose={() => setTimelineInvoice(null)}
      />

      <AppSnackbar open={snackbar.open} severity={snackbar.severity} message={snackbar.message} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />
    </Box>
  );
}
