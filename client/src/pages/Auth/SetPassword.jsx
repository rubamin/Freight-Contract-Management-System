import React, { useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { LockReset } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import * as authService from "../../services/authService";
import { logout, sessionUpdated } from "../../redux/slices/authSlice";
import { apiErrorMessage } from "../../utils/passwordRules";

// Import reusable components
import CustomButton from "../../components/common/CustomButton";
import PasswordField from "../../components/auth/PasswordField";
import PasswordChecklist from "../../components/auth/PasswordChecklist";

const MISMATCH_MESSAGE = "The new password and the repeated password do not match.";
const SESSION_EXPIRED_NOTICE = "Your time to set a password ran out. Please sign in again with the password from the email.";

// First sign-in (new account or after an admin reset): the user must
// choose their own password before anything else opens.
const SetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.MustChangePassword) return <Navigate to="/dashboard" replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const signOut = (notice) => {
    dispatch(logout());
    navigate("/login", { replace: true, state: notice ? { notice } : undefined });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError(MISMATCH_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const response = await authService.setPassword(formData);
      dispatch(sessionUpdated(response.data.data));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        signOut(SESSION_EXPIRED_NOTICE);
        return;
      }
      setError(apiErrorMessage(err, "Could not set your password. Please try again."));
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Set Your Password
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        Welcome{user?.FullName ? `, ${user.FullName}` : ""}. Before you continue, replace the temporary
        password from the email with one of your own.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <PasswordField
        label="New Password"
        name="newPassword"
        value={formData.newPassword}
        onChange={handleChange}
        autoComplete="new-password"
      />
      <PasswordChecklist password={formData.newPassword} name={user?.FullName} email={user?.Email} />

      <PasswordField
        label="Repeat New Password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        autoComplete="new-password"
      />

      <CustomButton loading={saving} loadingText="Saving..." icon={LockReset}>
        Set Password and Continue
      </CustomButton>

      <Box sx={{ textAlign: "center", mt: 2 }}>
        <Button size="small" onClick={() => signOut()}>
          Sign out
        </Button>
      </Box>
    </Box>
  );
};

export default SetPassword;
