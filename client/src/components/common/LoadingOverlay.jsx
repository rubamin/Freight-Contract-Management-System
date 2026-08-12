import React from "react";

import {
  Backdrop,
  CircularProgress,
  Typography,
  Box,
  Paper,
} from "@mui/material";

const LoadingOverlay = ({
  open = false,
  message = "Loading...",
}) => {
  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 999,
        backdropFilter: "blur(6px)",
        backgroundColor: "rgba(15,23,42,.35)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: 4,
          textAlign: "center",
          minWidth: 260,
        }}
      >
        <CircularProgress
          size={56}
          thickness={4}
        />

        <Typography
          mt={3}
          variant="h6"
          fontWeight={600}
        >
          {message}
        </Typography>

        <Typography
          mt={1}
          variant="body2"
          color="text.secondary"
        >
          Please wait...
        </Typography>
      </Paper>
    </Backdrop>
  );
};

export default LoadingOverlay;