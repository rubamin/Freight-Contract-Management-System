import React, { useEffect, useState } from "react";
import { Alert, Box, IconButton, InputAdornment, Typography } from "@mui/material";
import {
  LockOutlined,
  Visibility,
  VisibilityOff,
  LockReset,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword, clearPasswordResetStatus } from "../../redux/slices/authSlice";

// Import reusable components
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";

const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { loading, error, message } = useSelector((state) => state.auth.passwordReset);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    dispatch(clearPasswordResetStatus());
  }, [dispatch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFormError("This reset link is missing its token. Please request a new one.");
      return;
    }

    if (formData.newPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const result = await dispatch(
      resetPassword({ token, newPassword: formData.newPassword })
    );

    if (resetPassword.fulfilled.match(result)) {
      setSubmitted(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Reset Password
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
        Choose a new password for your account.
      </Typography>

      {!token && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          This reset link is invalid. Please request a new one from the Forgot Password page.
        </Alert>
      )}

      {(formError || error) && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {formError || error}
        </Alert>
      )}

      {submitted && message && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {message} Redirecting you to login...
        </Alert>
      )}

      {!submitted && (
        <>
          <CustomTextField
            label="New Password"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleChange}
            icon={LockOutlined}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="toggle password visibility"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />

          <CustomTextField
            label="Confirm New Password"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={LockOutlined}
          />

          <CustomButton loading={loading} loadingText="Resetting..." icon={LockReset} disabled={!token}>
            Reset Password
          </CustomButton>
        </>
      )}

      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Typography
          component={RouterLink}
          to="/login"
          variant="body2"
          sx={{
            color: "primary.main",
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Back to Login
        </Typography>
      </Box>
    </Box>
  );
};

export default ResetPassword;
