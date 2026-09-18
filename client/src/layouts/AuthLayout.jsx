import React from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
} from "@mui/material";
import { Outlet } from "react-router-dom";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflowY: "auto",
        background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #60A5FA 100%)",
        p: 2,
      }}
    >
      {/* Container Card for Authentication Forms */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 4,
          p: 5,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.18)",
        }}
      >
        {/* Brand Header Section */}
        <Stack
          spacing={1}
          sx={{ alignItems: "center", mb: 4 }}
        >
          {/* Logo Icon Container */}
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              bgcolor: "#1E3A8A",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
            }}
          >
            <LocalShippingIcon sx={{ fontSize: 36 }} />
          </Box>

          {/* System Title */}
          <Typography
            variant="h4"
            fontWeight={700}
            color="primary"
            sx={{ textAlign: "center" }}
          >
            Freight Contract Management System
          </Typography>
        </Stack>

        {/* Render child authentication routes (Login, Register, etc.) */}
        <Outlet />
      </Paper>
    </Box>
  );
};

export default AuthLayout;