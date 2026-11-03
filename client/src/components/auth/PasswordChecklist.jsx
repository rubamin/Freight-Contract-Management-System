import React from "react";
import { Box, Typography } from "@mui/material";
import { CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { checkPasswordRules } from "../../utils/passwordRules";
import { PASSWORD_HISTORY_DEPTH } from "../../constants/password";

// Live list of the password rules, ticked off while typing.
const PasswordChecklist = ({ password, name, email }) => (
  <Box sx={{ mt: 0.5, mb: 1 }}>
    {checkPasswordRules(password, { name, email }).map((rule) => (
      <Typography
        key={rule.label}
        variant="body2"
        sx={{ display: "flex", alignItems: "center", gap: 0.75, color: rule.met ? "success.main" : "text.secondary" }}
      >
        {rule.met ? <CheckCircle sx={{ fontSize: 16 }} /> : <RadioButtonUnchecked sx={{ fontSize: 16 }} />}
        {rule.label}
      </Typography>
    ))}
    <Typography variant="caption" color="text.secondary">
      It also can&apos;t be your current password or one of your last {PASSWORD_HISTORY_DEPTH}.
    </Typography>
  </Box>
);

export default PasswordChecklist;
