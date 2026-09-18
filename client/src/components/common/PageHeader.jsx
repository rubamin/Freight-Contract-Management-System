import React from "react";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Button,
  Paper,
  Stack,
} from "@mui/material";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";

const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  buttonText,
  buttonIcon,
  onButtonClick,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: 3,
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 4px 18px rgba(15,23,42,0.05)",
      }}
    >
      {/* Header Container Layout */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
        }}
        spacing={2}
      >
        <Box>
          {/* Breadcrumb Navigation Links */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 1 }}
          >
            <Link
              underline="hover"
              color="inherit"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontWeight: 500,
              }}
            >
              <HomeRoundedIcon sx={{ fontSize: 18 }} />
              Home
            </Link>

            {breadcrumbs.map((item, index) =>
              item.path ? (
                <Link
                  key={index}
                  underline="hover"
                  color="inherit"
                  href={item.path}
                  sx={{ fontWeight: 500 }}
                >
                  {item.label}
                </Link>
              ) : (
                <Typography
                  key={index}
                  color="primary"
                  fontWeight={600}
                >
                  {item.label}
                </Typography>
              )
            )}
          </Breadcrumbs>

          {/* Page Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#1F2937",
              mb: subtitle ? 0.5 : 0,
            }}
          >
            {title}
          </Typography>

          {/* Optional Subtitle */}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Optional Action Button */}
        {buttonText && (
          <Button
            variant="contained"
            size="large"
            startIcon={buttonIcon}
            onClick={onButtonClick}
            sx={{
              borderRadius: 2,
              px: 3,
              minWidth: 180,
              fontWeight: 600,
            }}
          >
            {buttonText}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

export default PageHeader;