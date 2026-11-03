import React from "react";
import { Button } from "@mui/material";
import { FileDownload } from "@mui/icons-material";
import { getContractTemplate } from "../../constants/contractTypes";

// Download link for the fixed-format Excel template that the contract
// upload expects for the given contract type.
const RateMatrixTemplateLink = ({ contractType }) => {
  const template = getContractTemplate(contractType);
  return (
    <Button
      component="a"
      href={template.url}
      download={template.fileName}
      size="small"
      startIcon={<FileDownload />}
      sx={{ mt: 1, textTransform: "none" }}
    >
      Download Rate Matrix Template
    </Button>
  );
};

export default RateMatrixTemplateLink;
