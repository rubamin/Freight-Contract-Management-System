import React from "react";
import { Snackbar, Alert } from "@mui/material";

const AppSnackbar = ({
  open,
  onClose,
  severity = "success",
  message = "",
  autoHideDuration = 3000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
    >
      <Alert
        severity={severity}
        variant="filled"
        elevation={0}
        onClose={onClose}
        sx={{
          minWidth: 360,
          borderRadius: 3,
          fontWeight: 500,
          alignItems: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;