import React from "react";
import {
  Box,
  Paper,
  Skeleton,
  Stack,
} from "@mui/material";

const SkeletonTable = ({
  rows = 8,
  columns = 6,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      {/* Toolbar Skeleton Section */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Skeleton
            variant="text"
            width={220}
            height={35}
          />

          <Skeleton
            variant="rounded"
            width={140}
            height={40}
          />
        </Stack>
      </Box>

      {/* Header Skeleton Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 2,
          p: 2,
          bgcolor: "#F8FAFC",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            height={28}
          />
        ))}
      </Box>

      {/* Rows Skeleton Grid Loop */}
      {Array.from({ length: rows }).map((_, row) => (
        <Box
          key={row}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 2,
            p: 2,
            borderBottom:
              row !== rows - 1
                ? "1px solid #F1F5F9"
                : "none",
          }}
        >
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton
              key={col}
              variant="text"
              height={24}
            />
          ))}
        </Box>
      ))}
    </Paper>
  );
};

export default SkeletonTable;