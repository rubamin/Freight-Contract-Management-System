import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { ArrowBack, EmailOutlined, LockReset, Pin } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword, clearPasswordResetStatus } from "../../redux/slices/authSlice";
import { OTP_LENGTH, RESEND_WAIT_SECONDS } from "../../constants/password";

// Import reusable components
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";
import PasswordField from "../../components/auth/PasswordField";
import PasswordChecklist from "../../components/auth/PasswordChecklist";

const MISMATCH_MESSAGE = "The new password and the repeated password do not match.";

// Step 2 of "Forgot password": the emailed 6-digit code plus the new
// password. The user then signs in with the new password.
const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromCodeRequest = Boolean(location.state?.email);

  const { loading, error } = useSelector((state) => state.auth.passwordReset);
  const [formData, setFormData] = useState({
    Email: location.state?.email || "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [formError, setFormError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(cameFromCodeRequest ? RESEND_WAIT_SECONDS : 0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    dispatch(clearPasswordResetStatus());
  }, [dispatch]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "otp" ? value.replace(/\D/g, "").slice(0, OTP_LENGTH) : value;
    setFormError("");
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleResend = async () => {
    setNotice("");
    if (!formData.Email.trim()) {
      setFormError("Enter your email first.");
      return;
    }
    setResending(true);
    const result = await dispatch(forgotPassword({ Email: formData.Email.trim() }));
    setResending(false);
    if (forgotPassword.fulfilled.match(result)) {
      setNotice(result.payload);
      setSecondsLeft(RESEND_WAIT_SECONDS);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");
    if (formData.newPassword !== formData.confirmPassword) {
      setFormError(MISMATCH_MESSAGE);
      return;
    }

    const result = await dispatch(resetPassword({ ...formData, Email: formData.Email.trim() }));
    if (resetPassword.fulfilled.match(result)) {
      navigate("/login", { replace: true, state: { notice: result.payload } });
    }
  };

  const shownError = formError || error;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Set a New Password
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        Enter the 6-digit code from the email and choose a new password.
      </Typography>

      {notice && !shownError && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {notice}
        </Alert>
      )}

      {shownError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {shownError}
        </Alert>
      )}

      <CustomTextField
        label="Email"
        name="Email"
        type="email"
        value={formData.Email}
        onChange={handleChange}
        icon={EmailOutlined}
      />

      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <CustomTextField
          label={`${OTP_LENGTH}-digit code`}
          name="otp"
          value={formData.otp}
          onChange={handleChange}
          icon={Pin}
        />
        <Button
          variant="outlined"
          onClick={handleResend}
          disabled={secondsLeft > 0 || resending}
          sx={{ mt: 1, whiteSpace: "nowrap", minWidth: 150, height: 56 }}
        >
          {secondsLeft > 0 ? `Send a new code (${secondsLeft}s)` : "Send a new code"}
        </Button>
      </Box>

      <PasswordField
        label="New Password"
        name="newPassword"
        value={formData.newPassword}
        onChange={handleChange}
        autoComplete="new-password"
      />
      <PasswordChecklist password={formData.newPassword} email={formData.Email} />

      <PasswordField
        label="Repeat New Password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        autoComplete="new-password"
      />

      <CustomButton loading={loading && !resending} loadingText="Saving..." icon={LockReset}>
        Set New Password
      </CustomButton>

      <Box sx={{ textAlign: "center", mt: 3 }}>
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

export default ResetPassword;
