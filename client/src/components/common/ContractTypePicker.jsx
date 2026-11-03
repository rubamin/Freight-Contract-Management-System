import React from "react";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { LocalShipping } from "@mui/icons-material";
import { CONTRACT_TYPE_OPTIONS } from "../../constants/contractTypes";

// First step of Add Contract / Add Invoice: asks which contract type the
// user is working with, because the template and the columns depend on it.
// Add Invoice passes INVOICE_TYPE_OPTIONS to also offer Ad-Hoc.
const ContractTypePicker = ({ title, subtitle, onSelect, options = CONTRACT_TYPE_OPTIONS }) => (
  <Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#111827" }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
        {subtitle}
      </Typography>
    )}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
      {options.map((option) => (
        <Card key={option.value} variant="outlined" sx={{ borderRadius: 2, "&:hover": { borderColor: "primary.main" } }}>
          <CardActionArea onClick={() => onSelect(option.value)} sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LocalShipping color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {option.label}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {option.description}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1 }}>
                e.g. {option.example}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  </Box>
);

export default ContractTypePicker;
