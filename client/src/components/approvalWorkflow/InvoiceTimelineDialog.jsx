import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ApprovalStatusChip from "./ApprovalStatusChip";
import { getInvoiceTimeline } from "../../services/approvalWorkflowService";
import { EVENT_TYPE_LABELS, TASK_STATUS_LABELS } from "../../constants/approvalWorkflow";
import { formatDateTimeDisplay } from "../../utils/dateFormat";

const SummaryItem = ({ label, value }) => (
  <Box>
    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>{value || "-"}</Typography>
  </Box>
);

const pendingStepName = (tasks, invoice) =>
  tasks.find((task) => task.StepOrder === invoice.CurrentStepOrder && task.TaskStatus === "PENDING")?.StepName;

// Full approval record of one invoice: who entered it, when it was a
// draft, sent for approval and approved, every event and every task.
export default function InvoiceTimelineDialog({ invoiceId, invoiceNumber, onClose }) {
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) return undefined;
    let isMounted = true;
    setTimeline(null);
    setError("");
    getInvoiceTimeline(invoiceId)
      .then((data) => isMounted && setTimeline(data))
      .catch((err) => isMounted && setError(err?.response?.data?.message || "Failed to load the approval history."));
    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const invoice = timeline?.invoice;

  return (
    <Dialog open={Boolean(invoiceId)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Approval history: invoice {invoiceNumber}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!error && !timeline && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>
        )}
        {invoice && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Approval status</Typography>
                <ApprovalStatusChip status={invoice.ApprovalStatus} stepName={pendingStepName(timeline.tasks, invoice)} />
              </Box>
              <SummaryItem label="Entered by" value={invoice.UploadedByName ? `${invoice.UploadedByName} (${invoice.UploadedByEmail})` : null} />
              <SummaryItem label="Entered on" value={formatDateTimeDisplay(invoice.UploadedDate)} />
              <SummaryItem label="Draft saved on" value={formatDateTimeDisplay(invoice.DraftCreatedAt)} />
              <SummaryItem label="Approver chosen by uploader" value={invoice.SelectedApproverName} />
              <SummaryItem label="Sent for approval on" value={formatDateTimeDisplay(invoice.SubmittedForApprovalAt)} />
              <SummaryItem label="Approved by" value={invoice.FinalApprovedByName} />
              <SummaryItem label="Approved on" value={formatDateTimeDisplay(invoice.FinalApprovedAt)} />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>What happened</Typography>
              {timeline.events.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No events recorded.</Typography>
              ) : (
                <Box sx={{ borderLeft: "2px solid #cbd5e1", pl: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {timeline.events.map((event) => (
                    <Box key={event.EventID}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {EVENT_TYPE_LABELS[event.EventType] || event.EventType}
                        {event.StepName ? ` - ${event.StepName}` : ""}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {formatDateTimeDisplay(event.EventAt)}{event.ActorName ? `, by ${event.ActorName}` : ""}
                      </Typography>
                      {event.Details && <Typography variant="body2">{event.Details}</Typography>}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {timeline.tasks.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Who it was assigned to</Typography>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Step</TableCell>
                        <TableCell>Assigned to</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Assigned on</TableCell>
                        <TableCell>Acted on</TableCell>
                        <TableCell>Acted by</TableCell>
                        <TableCell>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timeline.tasks.map((task) => (
                        <TableRow key={task.TaskID}>
                          <TableCell>{task.StepOrder}. {task.StepName}</TableCell>
                          <TableCell>{task.AssignedName || "-"}</TableCell>
                          <TableCell>{TASK_STATUS_LABELS[task.TaskStatus] || task.TaskStatus}</TableCell>
                          <TableCell>{formatDateTimeDisplay(task.AssignedAt)}</TableCell>
                          <TableCell>{formatDateTimeDisplay(task.ActedAt)}</TableCell>
                          <TableCell>{task.ActedByName || "-"}</TableCell>
                          <TableCell>{task.Remarks || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
