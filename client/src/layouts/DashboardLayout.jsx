import React, { useState } from "react";

import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";

import {
  Dashboard,

  Logout,
  People,
  AccountCircle,
  KeyboardArrowDown,

} from "@mui/icons-material";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { logout } from "../redux/slices/authSlice";
import { moduleNavigation } from "../constants/moduleConfigs";

// Define fixed sidebar width
const drawerWidth = 270;

// Combine static navigation items and dynamic configuration modules
const navigationItems = [
  {
    label: "Vendor Master",
    path: "/vendors",
    icon: <People />,
  },
  ...moduleNavigation.map((item) => ({
    label: item.title,
    path: item.path,
    icon: <Dashboard />,
  })),
];

const DashboardLayout = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract authenticated user details from Redux state
  const { user } = useSelector((state) => state.auth);


  // Profile menu anchor state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Open user profile dropdown menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close user profile dropdown menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle user logout action and redirection
  const handleLogoutClick = () => {
    handleMenuClose();
    dispatch(logout());
    navigate("/login");
  };

  // Determine current active page title based on path
  const currentItem = navigationItems.find((item) =>
    location.pathname.startsWith(item.path)
  );
  const pageTitle = currentItem ? currentItem.label : "Dashboard";

  return (
    <Box sx={{ display: "flex", bgcolor: "#F4F7FC", minHeight: "100vh" }}>
      {/* ===================== Top Navigation Bar ===================== */}
      <AppBar
        elevation={0}
        position="fixed"
        sx={{
          bgcolor: "#FFFFFF",
          color: "#1F2937",
          borderBottom: "1px solid #E5E7EB",
          ml: `${drawerWidth}px`,
          width: `calc(100% - ${drawerWidth}px)`,
          height: 72,

          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: "72px !important",
            px: 3,

            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >

          {/* Dynamic Page Title Section */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#1E293B",

              }}
            >
              {pageTitle}
            </Typography>
          </Box>

          {/* User Profile Trigger Section */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>

            <Box
              onClick={handleMenuOpen}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                p: 0.5,
                px: 1,
                borderRadius: 2,
                transition: "0.2s",
                "&:hover": { bgcolor: "#F1F5F9" },
              }}
            >
              <Avatar
                sx={{
                  bgcolor: "#1E3A8A",
                  width: 38,
                  height: 38,
                }}
              >
                <AccountCircle />
              </Avatar>

              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <Typography variant="body2" fontWeight={600} color="#1F2937">
                  {user?.FullName || "User"}
                </Typography>
              </Box>

              <KeyboardArrowDown fontSize="small" sx={{ color: "text.secondary" }} />
            </Box>

            {/* Profile Dropdown Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  borderRadius: 2,
                  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)",
                  "& .MuiMenuItem-root": {
                    fontSize: 14,
                    py: 1.2,
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {user?.FullName || "User"}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {user?.Email || "user@email.com"}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />

              <MenuItem onClick={handleLogoutClick} sx={{ color: "#DC2626" }}>
                <ListItemIcon sx={{ color: "#DC2626", minWidth: 30 }}>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ===================== Sidebar Navigation Drawer ===================== */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            bgcolor: "#1E293B",
            color: "#FFFFFF",
            borderRight: 0,
            boxShadow: "4px 0 18px rgba(0,0,0,.08)",

          },
        }}
      >
        <Toolbar />

        {/* Brand Header */}
        <Box sx={{ px: 3, py: 2, width: "100%" }}>
          <Typography variant="h5" fontWeight={700}>
            Freight Contract Management
          </Typography>

        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

        {/* Navigation List Links */}
        <List sx={{ px: 2, mt: 2 }}>
          {navigationItems.map((item) => {
            const active = location.pathname.startsWith(item.path);

            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}

                selected={active}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  color: active ? "#FFFFFF" : "#CBD5E1",
                  bgcolor: active ? "#2563EB" : "transparent",
                  "&:hover": {
                    bgcolor: "#2563EB",
                    color: "#FFFFFF",
                  },
                  "&.Mui-selected": {
                    bgcolor: "#2563EB",
                    "&:hover": {
                      bgcolor: "#2563EB",

                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "inherit",
                    minWidth: 40,

                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: active ? 600 : 500,
                    },
                  }}
                />
              </ListItemButton>
            );

          })}
        </List>
      </Drawer>

      {/* ===================== Main Dashboard Content Outlet ===================== */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${drawerWidth}px`,
          mt: "75px",
          p: 3,
          minHeight: "100vh",
          maxWidth: "1800px",
          mx: "auto",
        }}
      >
        <Outlet />

      </Box>
    </Box>
  );
};

export default DashboardLayout;