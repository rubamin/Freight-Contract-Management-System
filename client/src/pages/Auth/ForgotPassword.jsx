import React, { useEffect, useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { EmailOutlined, Send, ArrowBack } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { forgotPassword, clearPasswordResetStatus } from "../../redux/slices/authSlice";

// Import reusable components
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";

const linkSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  color: "primary.main",
  fontWeight: 600,
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
};

// Step 1 of "Forgot password": emails a 6-digit code, then moves on to
// the code + new password page (ResetPassword.jsx).
const ForgotPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.auth.passwordReset);
  const [email, setEmail] = useState("");

  // Reset any leftover status from a previous visit to this page
  useEffect(() => {
    dispatch(clearPasswordResetStatus());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const result = await dispatch(forgotPassword({ Email: trimmedEmail }));
    if (forgotPassword.fulfilled.match(result)) {
      navigate("/reset-password", { state: { email: trimmedEmail, notice: result.payload } });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Forgot Password?
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
        Enter the email associated with your account and we&apos;ll send you a 6-digit code to set a new password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <CustomTextField
        label="Email"
        name="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        icon={EmailOutlined}
      />

      <CustomButton loading={loading} loadingText="Sending Code..." icon={Send}>
        Send Code
      </CustomButton>

      <Box sx={{ textAlign: "center", mt: 3, display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
        <Typography component={RouterLink} to="/reset-password" variant="body2" sx={linkSx}>
          I already have a code
        </Typography>
        <Typography component={RouterLink} to="/login" variant="body2" sx={linkSx}>
          <ArrowBack fontSize="inherit" />
          Back to Login
        </Typography>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
