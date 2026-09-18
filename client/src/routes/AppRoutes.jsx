import React, { Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";

import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

// Auth
import Login from "../pages/Auth/Login";
import ForgotPassword from "../pages/Auth/ForgotPassword";
import ResetPassword from "../pages/Auth/ResetPassword";

// Dashboard
import Dashboard from "../pages/Dashboard/Dashboard";

// Reports
import Reports from "../pages/Reports/Reports";

// Vendor
import VendorList from "../pages/vendor/VendorList";
import AddVendor from "../pages/vendor/AddVendor";
import EditVendor from "../pages/vendor/EditVendor";
import ViewVendor from "../pages/vendor/ViewVendor";

// Masters
import ModuleList from "../pages/modules/ModuleList";
import ModuleForm from "../pages/modules/ModuleForm";
import { moduleConfigs } from "../constants/moduleConfigs";

// Contracts
import ContractList from "../pages/Contracts/ContractList";
import AddContract from "../pages/Contracts/AddContract";
import ViewContract from "../pages/Contracts/ViewContract";
import EditContract from "../pages/Contracts/EditContract";

// Invoice
import InvoiceList from "../pages/Invoices/InvoiceList";
import AddInvoice from "../pages/Invoices/AddInvoice";
import EditInvoice from "../pages/Invoices/EditInvoice";

// Settings (Added AdminSetting import from pages folder)
import AdminSettings from "../pages/Setting/AdminSettings";
import AccessRequestsList from "../pages/Setting/AccessRequestsList";
import UserSettings from "../pages/Setting/UserSettings";

// Users (User Master, task item 4)
import UserList from "../pages/Users/UserList";
import UserForm from "../pages/Users/UserForm";

// Profile
import Profile from "../pages/Profile/Profile";

const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

const NotFound = () => (
  <Container maxWidth="sm">
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      textAlign="center"
      gap={2}
    >
      <Typography
        variant="h1"
        color="primary"
        fontWeight={700}
      >
        404
      </Typography>

      <Typography variant="h5" fontWeight={600}>
        Page Not Found
      </Typography>

      <Typography color="text.secondary">
        The page you are trying to access doesn't exist.
      </Typography>

      <Button
        variant="contained"
        onClick={() => (window.location.href = "/dashboard")}
      >
        Go to Dashboard
      </Button>
    </Box>
  </Container>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route
                path="/login"
                element={<Login />}
              />
              <Route
                path="/forgot-password"
                element={<ForgotPassword />}
              />
              <Route
                path="/reset-password"
                element={<ResetPassword />}
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Reports */}
              <Route path="/reports" element={<Reports />} />

              {/* Vendor */}
              <Route path="/vendors" element={<VendorList />} />
              <Route path="/vendors/add" element={<AddVendor />} />
              <Route path="/vendors/edit/:id" element={<EditVendor />} />
              <Route path="/vendors/view/:id" element={<ViewVendor />} />

              {/* Masters */}
              <Route
                path="/masters/vehicle-types"
                element={<ModuleList configKey="vehicleTypes" />}
              />
              <Route
                path="/masters/vehicle-types/add"
                element={<ModuleForm configKey="vehicleTypes" config={moduleConfigs.vehicleTypes} />}
              />
              <Route
                path="/masters/vehicle-types/edit/:id"
                element={<ModuleForm configKey="vehicleTypes" config={moduleConfigs.vehicleTypes} />}
              />

              <Route
                path="/masters/weights"
                element={<ModuleList configKey="weights" />}
              />
              <Route
                path="/masters/weights/add"
                element={<ModuleForm configKey="weights" config={moduleConfigs.weights} />}
              />
              <Route
                path="/masters/weights/edit/:id"
                element={<ModuleForm configKey="weights" config={moduleConfigs.weights} />}
              />

              <Route
                path="/masters/destinations"
                element={<ModuleList configKey="destinations" />}
              />
              <Route
                path="/masters/destinations/add"
                element={<ModuleForm configKey="destinations" config={moduleConfigs.destinations} />}
              />
              <Route
                path="/masters/destinations/edit/:id"
                element={<ModuleForm configKey="destinations" config={moduleConfigs.destinations} />}
              />

              <Route
                path="/masters/customers"
                element={<ModuleList configKey="customers" />}
              />
              <Route
                path="/masters/customers/add"
                element={<ModuleForm configKey="customers" config={moduleConfigs.customers} />}
              />
              <Route
                path="/masters/customers/edit/:id"
                element={<ModuleForm configKey="customers" config={moduleConfigs.customers} />}
              />

              {/* Contracts */}
              <Route
                path="/contracts"
                element={<ContractList />}
              />

              <Route
                path="/contracts/add"
                element={<AddContract />}
              />

              {/* Core Contract Sub-Paths */}
              <Route 
                path="/contracts/view/:id" 
                element={<ViewContract />} 
              />
              <Route 
                path="/contracts/edit/:id" 
                element={<EditContract />} 
              />

              {/* Invoice */}
              <Route
                path="/invoices"
                element={<InvoiceList />}
              />

              <Route
                path="/invoices/add"
                element={<AddInvoice />}
              />

              <Route
                path="/invoices/edit"
                element={<EditInvoice />}
              />

              {/* Admin Settings Route */}
              <Route
                path="/admin/settings"
                element={<AdminSettings />}
              />

              {/* Access Requests queue (task item 19/20) */}
              <Route
                path="/admin/access-requests"
                element={<AccessRequestsList />}
              />

              {/* User Master (task item 4) */}
              <Route path="/admin/users" element={<UserList />} />
              <Route path="/admin/users/add" element={<UserForm />} />
              <Route path="/admin/users/edit/:id" element={<UserForm />} />

              {/* Personal Profile & Settings Routes */}
              <Route
                path="/profile"
                element={<Profile />}
              />

              <Route
                path="/settings/preferences"
                element={<UserSettings />}
              />

              {/* Workflow */}
              <Route
                path="/workflows/approvals"
                element={<ModuleList configKey="approvals" />}
              />

              <Route
                path="/workflows/audits"
                element={<ModuleList configKey="audits" />}
              />

              <Route
                path="/workflows/emails"
                element={<ModuleList configKey="emails" />}
              />
            </Route>
          </Route>

          {/* Fallback Catch-All Route */}
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;