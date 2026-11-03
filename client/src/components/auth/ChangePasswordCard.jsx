import React, { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Typography } from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import { useDispatch, useSelector } from "react-redux";
import * as userService from "../../services/userService";
import { sessionUpdated } from "../../redux/slices/authSlice";
import { apiErrorMessage } from "../../utils/passwordRules";
import PasswordField from "./PasswordField";
import PasswordChecklist from "./PasswordChecklist";

export const CHANGE_PASSWORD_ANCHOR = "change-password";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };
const MISMATCH_MESSAGE = "The new password and the repeated password do not match.";

// Signed-in "Change password": current password + new password + repeat.
const ChangePasswordCard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setResult(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setResult({ severity: "error", message: MISMATCH_MESSAGE });
      return;
    }

    setSaving(true);
    try {
      const response = await userService.changePassword(form);
      // The change ends every older session, including this one's token.
      dispatch(sessionUpdated(response.data.data));
      setForm(EMPTY_FORM);
      setResult({ severity: "success", message: response.data.message });
    } catch (err) {
      setResult({ severity: "error", message: apiErrorMessage(err, "Failed to change password.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id={CHANGE_PASSWORD_ANCHOR}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Change Password</Typography>

        {result && (
          <Alert severity={result.severity} sx={{ mb: 2 }}>
            {result.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <PasswordField
            label="Current Password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <PasswordField
            label="New Password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <PasswordChecklist password={form.newPassword} name={user?.FullName} email={user?.Email} />
          <PasswordField
            label="Repeat New Password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="warning"
              startIcon={<LockResetIcon />}
              disabled={saving}
            >
              {saving ? "Updating..." : "Change Password"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
