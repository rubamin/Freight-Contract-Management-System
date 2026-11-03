import React, { useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { EmailOutlined, Login as LoginIcon } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, Link as RouterLink } from "react-router-dom";
import { loginUser } from "../../redux/slices/authSlice";

// Import reusable components
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";
import PasswordField from "../../components/auth/PasswordField";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({ Email: "", Password: "" });
  const notice = location.state?.notice;

  // Handle input changes dynamically
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission. A user signing in with a temporary password
  // must set their own password first.
  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(loginUser(formData));
    if (loginUser.fulfilled.match(result)) {
      const nextPath = result.payload.user?.MustChangePassword ? "/set-password" : "/dashboard";
      navigate(nextPath, { replace: true });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Welcome Back
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
        Sign in to continue to your dashboard
      </Typography>

      {notice && !error && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {notice}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Reusable Email Field */}
      <CustomTextField
        label="Email"
        name="Email"
        type="email"
        value={formData.Email}
        onChange={handleChange}
        icon={EmailOutlined}
      />

      {/* Password Field with Visibility Toggle */}
      <PasswordField
        label="Password"
        name="Password"
        value={formData.Password}
        onChange={handleChange}
        autoComplete="current-password"
      />

      <Box sx={{ textAlign: "right", mt: 1 }}>
        <Typography
          component={RouterLink}
          to="/forgot-password"
          variant="body2"
          sx={{
            color: "primary.main",
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Forgot password?
        </Typography>
      </Box>

      {/* Reusable Submit Button */}
      <CustomButton loading={loading} loadingText="Signing In..." icon={LoginIcon}>
        Login
      </CustomButton>
    </Box>
  );
};

export default Login;
