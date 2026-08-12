import React from "react";
import {
  Button,
  CircularProgress,
} from "@mui/material";

const PrimaryButton = ({
  children,
  loading = false,
  startIcon,
  endIcon,
  fullWidth = false,
  size = "medium",
  variant = "contained",
  color = "primary",
  sx = {},
  disabled = false,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={!loading ? startIcon : null}
      endIcon={!loading ? endIcon : null}
      disableElevation
      sx={{
        minHeight: 44,
        px: 3,
        borderRadius: 2.5,
        fontWeight: 600,
        textTransform: "none",
        transition: "all .25s ease",

        "&:hover": {
          transform: "translateY(-1px)",
        },

        ...sx,
      }}
      {...props}
    >
      {loading ? (
        <>
          <CircularProgress
            size={20}
            color="inherit"
            sx={{ mr: 1 }}
          />
          Please Wait...
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default PrimaryButton;