import React, { useState } from "react";
import { Alert, Box, Tab, Tabs } from "@mui/material";
import ContractSheetTable from "./ContractSheetTable";
import { getSheetConfigs } from "../../constants/contractSheets";

// Editable sheets (one tab each) of an FTL Inbound, PTL Outbound or Part
// Load contract. `sheets` is the state built by buildContractSheets.
const ContractTypeSheetsEditor = ({ contractType, sheets, destinationOptions, onSheetChange, replacedByUpload }) => {
  const [activeTab, setActiveTab] = useState(0);
  const configs = getSheetConfigs(contractType).filter((config) => sheets[config.id]);
  const activeConfig = configs[Math.min(activeTab, configs.length - 1)];

  if (!activeConfig) return null;

  return (
    <Box>
      {replacedByUpload && (
        <Alert severity="info" sx={{ mb: 2 }}>
          A new Excel file is selected. On save it replaces these sheets, so edits made here are not saved.
        </Alert>
      )}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={configs.indexOf(activeConfig)} onChange={(e, value) => setActiveTab(value)} variant="scrollable">
          {configs.map((config) => (
            <Tab key={config.id} label={`${config.title} (${sheets[config.id].rows.length})`} />
          ))}
        </Tabs>
      </Box>
      <ContractSheetTable
        key={activeConfig.id}
        config={activeConfig}
        sheet={sheets[activeConfig.id]}
        destinationOptions={destinationOptions}
        onChange={(sheet) => onSheetChange(activeConfig.id, sheet)}
      />
    </Box>
  );
};

export default ContractTypeSheetsEditor;
