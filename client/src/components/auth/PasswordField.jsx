import React, { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { LockOutlined, Visibility, VisibilityOff } from "@mui/icons-material";

// Password input with a show / hide toggle.
const PasswordField = ({ label, name, value, onChange, autoComplete, margin = "normal" }) => {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      fullWidth
      required
      label={label}
      name={name}
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      margin={margin}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <LockOutlined color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                onClick={() => setVisible((prev) => !prev)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default PasswordField;
