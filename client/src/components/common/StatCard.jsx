import React from "react";
import { Card, CardContent, Box, Typography, Avatar } from "@mui/material";

const StatCard = ({ title, value, subtitle, icon, color = "primary" }) => {
  // Theme configuration for standard operational status badges
  const colorMap = {
    primary: { bg: "#EEF2FF", text: "#1E40AF", iconBg: "#1E3A8A" },
    success: { bg: "#F0FDF4", text: "#166534", iconBg: "#22C55E" },
    error: { bg: "#FEF2F2", text: "#991B1B", iconBg: "#EF4444" },
    warning: { bg: "#FFFBEB", text: "#92400E", iconBg: "#F59E0B" }
  };

  const currentTheme = colorMap[color] || colorMap.primary;

  return (
    <Card 
      elevation={0}
      sx={{ 
        width: "100%", 
        borderRadius: "24px", // Matches the soft curved borders 
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.01)",
      }}
    >
      <CardContent sx={{ minWidth: "190px", p: 3, "&:last-child": { pb: 3 } }}>
        {/* Layout Box container with flex styles properly wrapped inside sx */}
        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "flex-start", 
            textAlign: "left" 
          }}
        >
          {/* Big Highlighted Aggregation Counter Value */}
          <Typography variant="h3" sx={{ fontWeight: 700, color: "#111827", mb: 0.5 }}>
            {value}
          </Typography>
          
          {/* Secondary Subtitle Labeling */}
          <Typography variant="body2" sx={{ color: "#4B5563", fontWeight: 500, mb: 2 }}>
            {subtitle}
          </Typography>

          {/* Icon Badge container matching exact layout structure */}
          <Avatar
            sx={{
              bgcolor: currentTheme.iconBg, // Fill with main background accent directly
              color: "#FFFFFF",
              width: 44,
              height: 44,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;