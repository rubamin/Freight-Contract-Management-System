import React, { useEffect, useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { EmailOutlined, Send, ArrowBack } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink } from "react-router-dom";
import { forgotPassword, clearPasswordResetStatus } from "../../redux/slices/authSlice";

// Import reusable components
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";

const ForgotPassword = () => {
  const dispatch = useDispatch();

  const { loading, error, message } = useSelector((state) => state.auth.passwordReset);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Reset any leftover status from a previous visit to this page
  useEffect(() => {
    dispatch(clearPasswordResetStatus());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(forgotPassword({ Email: email }));
    if (forgotPassword.fulfilled.match(result)) {
      setSubmitted(true);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Forgot Password?
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
        Enter the email associated with your account and we'll send you a link to reset your password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {submitted && message && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {message}
        </Alert>
      )}

      {!submitted && (
        <>
          <CustomTextField
            label="Email"
            name="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={EmailOutlined}
          />

          <CustomButton loading={loading} loadingText="Sending Link..." icon={Send}>
            Send Reset Link
          </CustomButton>
        </>
      )}

      <Box sx={{ textAlign: "center", mt: submitted ? 1 : 3 }}>
        <Typography
          component={RouterLink}
          to="/login"
          variant="body2"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            color: "primary.main",
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          <ArrowBack fontSize="inherit" />
          Back to Login
        </Typography>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
