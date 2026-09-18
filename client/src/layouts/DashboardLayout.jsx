<<<<<<< HEAD
import React, { useState, useEffect } from "react";
=======
import React, { useState } from "react";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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
<<<<<<< HEAD
  IconButton,
  Tooltip,
} from "@mui/material";

import {
  Dashboard as DashboardIcon,
=======
} from "@mui/material";

import {
  Dashboard,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  Logout,
  People,
  AccountCircle,
  KeyboardArrowDown,
<<<<<<< HEAD
  Person,
  Settings,
  Assessment,
  ChevronLeft,
  ChevronRight,
  LocalShipping,
  Place,
  Scale,
  DirectionsCar,
  Groups,
  ManageAccounts,
  Menu as MenuIcon,
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
} from "@mui/icons-material";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
<<<<<<< HEAD
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { logout } from "../redux/slices/authSlice";
import { MODULE_KEYS } from "../constants/modules";
import { getMyPermissions } from "../services/userService";
import useLocalStorageState from "../hooks/useLocalStorageState";
import NotificationCenter from "../components/common/NotificationCenter";

// Sidebar widths for the expanded and collapsed (icons-only) states
const EXPANDED_DRAWER_WIDTH = 270;
const COLLAPSED_DRAWER_WIDTH = 80;
const SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebarCollapsed";

// Every possible sidebar item, each tagged with the module permission key
// that gates it (task item 3: "Build the sidebar dynamically from the
// logged-in user's permission set rather than hardcoding a static list").
// Dashboard, My Profile and My Settings have no gate - every authenticated
// user sees those regardless of module permissions.
const ALL_NAVIGATION_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, moduleKey: null },
  { label: "Vendor Master", path: "/vendors", icon: <People />, moduleKey: MODULE_KEYS.VENDOR_MASTER },
  { label: "Contract Master", path: "/contracts", icon: <LocalShipping />, moduleKey: MODULE_KEYS.CONTRACT_MASTER },
  { label: "Destination Master", path: "/masters/destinations", icon: <Place />, moduleKey: MODULE_KEYS.DESTINATION_MASTER },
  { label: "Weight Master", path: "/masters/weights", icon: <Scale />, moduleKey: MODULE_KEYS.WEIGHT_MASTER },
  { label: "Vehicle Type Master", path: "/masters/vehicle-types", icon: <DirectionsCar />, moduleKey: MODULE_KEYS.VEHICLE_TYPE_MASTER },
  { label: "Customer Master", path: "/masters/customers", icon: <Groups />, moduleKey: MODULE_KEYS.CUSTOMER_MASTER },
  { label: "Invoices", path: "/invoices", icon: <DashboardIcon />, moduleKey: MODULE_KEYS.INVOICES },
  { label: "User Master", path: "/admin/users", icon: <ManageAccounts />, moduleKey: MODULE_KEYS.USER_MASTER },
  { label: "Settings & Hierarchy", path: "/admin/settings", icon: <Settings />, moduleKey: MODULE_KEYS.SETTINGS_HIERARCHY },
  { label: "Access Requests", path: "/admin/access-requests", icon: <ManageAccounts />, moduleKey: MODULE_KEYS.USER_MASTER },
  { label: "Reports", path: "/reports", icon: <Assessment />, moduleKey: MODULE_KEYS.REPORTS },
  { label: "My Profile", path: "/profile", icon: <Person />, moduleKey: null },
  { label: "My Settings", path: "/settings/preferences", icon: <Settings />, moduleKey: null },
];

const DashboardLayout = () => {
  const theme = useTheme();
=======

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
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract authenticated user details from Redux state
  const { user } = useSelector((state) => state.auth);

<<<<<<< HEAD
  // Module permissions drive which sidebar items render (task item 3).
  // Admins get every item; everyone else only sees modules where
  // CanView is true. Defaults to just the ungated items (Dashboard,
  // My Profile, My Settings) while permissions are still loading, so the
  // sidebar never flashes the full admin list before narrowing.
  const [permissions, setPermissions] = useState({ isAdmin: false, modulePermissions: {} });

  useEffect(() => {
    let isMounted = true;
    getMyPermissions()
      .then((res) => {
        if (isMounted) setPermissions(res.data.data);
      })
      .catch((err) => console.error("Failed to load sidebar permissions", err));
    return () => {
      isMounted = false;
    };
  }, []);

  const navigationItems = ALL_NAVIGATION_ITEMS.filter((item) => {
    if (!item.moduleKey) return true;
    if (permissions.isAdmin) return true;
    return Boolean(permissions.modulePermissions?.[item.moduleKey]?.CanView);
  });

  // Sidebar collapsed/expanded state, persisted across refreshes
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState(
    SIDEBAR_COLLAPSED_STORAGE_KEY,
    false
  );

  // Bug fix (task item 2): the sidebar used to always render as a
  // permanent, space-reserving drawer, which on phone-width screens left
  // little to no room for actual page content. Below the "sm" breakpoint
  // it now renders as an overlay drawer instead (task item 2's UI/UX
  // responsiveness pass), closed by default and toggled via a hamburger
  // button in the app bar.
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const drawerWidth = isMobile
    ? 0
    : isSidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : EXPANDED_DRAWER_WIDTH;

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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
<<<<<<< HEAD
          transition: "margin-left 0.2s ease, width 0.2s ease",
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: "72px !important",
<<<<<<< HEAD
            px: { xs: 2, sm: 3 },
=======
            px: 3,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
<<<<<<< HEAD
          {/* Hamburger toggle - mobile only, opens the overlay sidebar */}
          {isMobile && (
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              sx={{ mr: 1 }}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          )}

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          {/* Dynamic Page Title Section */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
<<<<<<< HEAD
                color: theme.palette.text.primary,
=======
                color: "#1E293B",
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
              }}
            >
              {pageTitle}
            </Typography>
          </Box>

          {/* User Profile Trigger Section */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
<<<<<<< HEAD
            <NotificationCenter />

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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
<<<<<<< HEAD
              <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <Person fontSize="small" />
                </ListItemIcon>
                My Profile
              </MenuItem>
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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
<<<<<<< HEAD
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileDrawerOpen : true}
        onClose={() => setMobileDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? EXPANDED_DRAWER_WIDTH : drawerWidth,
          flexShrink: 0,
          transition: "width 0.2s ease",
          "& .MuiDrawer-paper": {
            width: isMobile ? EXPANDED_DRAWER_WIDTH : drawerWidth,
            bgcolor: theme.palette.sidebar.background,
            color: "#FFFFFF",
            borderRight: 0,
            boxShadow: "4px 0 18px rgba(0,0,0,.08)",
            overflowX: "hidden",
            transition: "width 0.2s ease",
=======
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
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          },
        }}
      >
        <Toolbar />

<<<<<<< HEAD
        {/* Brand Header + Collapse Toggle */}
        <Box
          sx={{
            px: isSidebarCollapsed ? 1.5 : 3,
            py: 2,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
          }}
        >
          {!isSidebarCollapsed && (
            <Typography variant="h5" fontWeight={700} noWrap sx={{ fontSize: "1.15rem" }}>
              Freight Contract Management
            </Typography>
          )}

          {!isMobile && (
            <Tooltip title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <IconButton
                onClick={handleSidebarToggle}
                size="small"
                sx={{ color: theme.palette.sidebar.textMuted, "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255,255,255,.08)" } }}
              >
                {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Tooltip>
          )}
=======
        {/* Brand Header */}
        <Box sx={{ px: 3, py: 2, width: "100%" }}>
          <Typography variant="h5" fontWeight={700}>
            Freight Contract Management
          </Typography>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

        {/* Navigation List Links */}
<<<<<<< HEAD
        <List sx={{ px: isSidebarCollapsed ? 1 : 2, mt: 2 }}>
          {navigationItems.map((item) => {
            const active = location.pathname.startsWith(item.path);

            const listItemButton = (
              <ListItemButton
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileDrawerOpen(false);
                }}
=======
        <List sx={{ px: 2, mt: 2 }}>
          {navigationItems.map((item) => {
            const active = location.pathname.startsWith(item.path);

            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
                selected={active}
                sx={{
                  borderRadius: 2,
                  mb: 1,
<<<<<<< HEAD
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  color: active ? "#FFFFFF" : theme.palette.sidebar.textMuted,
                  bgcolor: active ? theme.palette.sidebar.activeItem : "transparent",
                  "&:hover": {
                    bgcolor: theme.palette.sidebar.activeItem,
                    color: "#FFFFFF",
                  },
                  "&.Mui-selected": {
                    bgcolor: theme.palette.sidebar.activeItem,
                    "&:hover": {
                      bgcolor: theme.palette.sidebar.activeItem,
=======
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
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "inherit",
<<<<<<< HEAD
                    minWidth: isSidebarCollapsed ? 0 : 40,
                    justifyContent: "center",
=======
                    minWidth: 40,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
                  }}
                >
                  {item.icon}
                </ListItemIcon>
<<<<<<< HEAD
                {!isSidebarCollapsed && (
                  <ListItemText
                    primary={item.label}
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontWeight: active ? 600 : 500,
                      },
                    }}
                  />
                )}
              </ListItemButton>
            );

            return isSidebarCollapsed ? (
              <Tooltip key={item.path} title={item.label} placement="right">
                {listItemButton}
              </Tooltip>
            ) : (
              <React.Fragment key={item.path}>{listItemButton}</React.Fragment>
            );
=======
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
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          })}
        </List>
      </Drawer>

      {/* ===================== Main Dashboard Content Outlet ===================== */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
<<<<<<< HEAD
          // Bug fix (task item 21): the permanent Drawer right above this
          // Box is already a normal flex child (flexShrink: 0, width:
          // drawerWidth) in this Box's parent flex row, so it already
          // reserves drawerWidth of horizontal space and pushes this Box
          // over correctly on its own. Adding `ml: drawerWidth` here on
          // top of that double-counted the sidebar width, leaving a large
          // empty gap before the page content - most visible on
          // laptop-size screens. The AppBar's own ml/width above is
          // unaffected by this fix since it's `position: fixed` and
          // isn't part of this flex layout at all.
          mt: "75px",
          p: { xs: 2, sm: 3 },
          minHeight: "calc(100vh - 75px)",
          minWidth: 0,
          overflowX: "auto",
          transition: "margin-left 0.2s ease",
        }}
      >
        <Box sx={{ maxWidth: "1800px", mx: "auto" }}>
          <Outlet />
        </Box>
=======
          ml: `${drawerWidth}px`,
          mt: "75px",
          p: 3,
          minHeight: "100vh",
          maxWidth: "1800px",
          mx: "auto",
        }}
      >
        <Outlet />
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      </Box>
    </Box>
  );
};

export default DashboardLayout;