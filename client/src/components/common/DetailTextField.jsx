import React from "react";
import { TextField } from "@mui/material";

const DetailTextField = ({ label, value, xs = 12, md = 6, multiline = false, rows = 1 }) => {
  return (
    <TextField
      fullWidth
      multiline={multiline}
      rows={rows}
      label={label}
      value={value || ""}
      slotProps={{
        input: {
          readOnly: true,
        },
      }}
    />
  );
};

export default DetailTextField;