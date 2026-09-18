import React from "react";
import { Paper } from "@mui/material";

const PageCard = ({
  children,
  sx = {},
  hover = false,
  ...props
}) => {
  return (
    <Paper
      elevation={0}
      {...props}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "#FFFFFF",
        boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
        transition: "all .25s ease",

        ...(hover && {
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: "0 12px 30px rgba(15,23,42,.08)",
          },
        }),

        ...sx,
      }}
    >
      {children}
    </Paper>
  );
};

export default PageCard;