import React from "react";
import { TextField, InputAdornment } from "@mui/material";

const CustomTextField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = true,
  icon: Icon,
  endAdornment,
}) => {
  return (
    <TextField
      fullWidth
      required={required}
      label={label}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      margin="normal"
      slotProps={{
        input: {
          startAdornment: Icon ? (
            <InputAdornment position="start">
              <Icon color="action" />
            </InputAdornment>
          ) : undefined,
          endAdornment: endAdornment,
        },
      }}
    />
  );
};

export default CustomTextField;