import React from "react";
import { Avatar, Box, Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

// Compact KPI card: coloured accent, label, big value, optional caption.
// Clickable when onClick is given (e.g. to switch a tab).
const SummaryCard = ({ label, value, caption, icon, color = "primary", active = false, onClick }) => {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: active ? main : "divider",
        borderLeft: `4px solid ${main}`,
        bgcolor: active ? alpha(main, 0.06) : "background.paper",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .2s, transform .2s",
        "&:hover": onClick ? { boxShadow: "0 6px 18px rgba(15,23,42,0.08)", transform: "translateY(-1px)" } : undefined,
      }}
    >
      {icon && (
        <Avatar sx={{ bgcolor: alpha(main, 0.12), color: main, width: 42, height: 42 }}>
          {icon}
        </Avatar>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} noWrap title={String(value)} sx={{ lineHeight: 1.3 }}>
          {value}
        </Typography>
        {caption && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{caption}</Typography>}
      </Box>
    </Paper>
  );
};

export default SummaryCard;
