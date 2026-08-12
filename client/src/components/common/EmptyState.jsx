import React from "react";
import {
  Box,
  Typography,
} from "@mui/material";

import InboxRoundedIcon from "@mui/icons-material/InboxRounded";

import PrimaryButton from "./PrimaryButton";

const EmptyState = ({
  title = "No Records Found",
  description = "There is no data available at the moment.",
  icon = <InboxRoundedIcon sx={{ fontSize: 80 }} />,
  buttonText,
  buttonIcon,
  onButtonClick,
}) => {
  return (
    <Box
      sx={{
        p: 6,
        borderRadius: 3,
        border: "1px dashed",
        borderColor: "divider",
        bgcolor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          bgcolor: "#EEF4FF",
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
        }}
      >
        {icon}
      </Box>

      <Typography
        variant="h5"
        fontWeight={700}
        gutterBottom
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          maxWidth: 450,
          mb: buttonText ? 4 : 0,
        }}
      >
        {description}
      </Typography>

      {buttonText && (
        <PrimaryButton
          startIcon={buttonIcon}
          onClick={onButtonClick}
        >
          {buttonText}
        </PrimaryButton>
      )}
    </Box>
  );
};

export default EmptyState;