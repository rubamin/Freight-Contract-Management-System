import React from "react";
import { Button, CircularProgress } from "@mui/material";

const CustomButton = ({
  loading,
  loadingText = "Loading...",
  children,
  icon: Icon,
  type = "submit",
  fullWidth = true,
  variant = "contained",
  size = "large",
  sx = {},
}) => {
  return (
    <Button
      fullWidth={fullWidth}
      variant={variant}
      size={size}
      type={type}
      disabled={loading}
      startIcon={!loading && Icon ? <Icon /> : undefined}
      sx={{
        mt: 4,
        height: 50,
        borderRadius: 2,
        fontSize: 16,
        fontWeight: 600,
        ...sx,
      }}
    >
      {loading ? (
        <>
          <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default CustomButton;