import React from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { ForwardToInbox } from "@mui/icons-material";

// Confirms "E-mail new password" for one user.
const EmailPasswordDialog = ({ user, sending, onClose, onConfirm }) => (
  <Dialog open={Boolean(user)} onClose={!sending ? onClose : undefined} fullWidth maxWidth="xs">
    <DialogTitle sx={{ fontWeight: 700 }}>E-mail new password</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Send a new temporary password to {user?.FullName || "this user"} ({user?.Email})? Their current password
        stops working and they must set their own at next sign-in. If the email can&apos;t be sent, nothing changes.
      </DialogContentText>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={sending}>Cancel</Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={sending}
        startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <ForwardToInbox />}
      >
        {sending ? "Sending..." : "Send"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default EmailPasswordDialog;
