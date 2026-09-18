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
      // Bug fix (task item 2): Snackbar's default top offset placed it
      // directly over the fixed 72px-tall AppBar header, so alert/success
      // banners visually overlapped header content (e.g. on the
      // Dashboard). Pushing it below the header height fixes that on every
      // page that uses AppSnackbar, not just Dashboard.
      sx={{ top: { xs: 16, sm: 88 } }}
    >
      <Alert
        severity={severity}
        variant="filled"
        elevation={0}
        onClose={onClose}
        sx={{
          minWidth: { xs: "auto", sm: 360 },
          maxWidth: { xs: "calc(100vw - 32px)", sm: 480 },
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