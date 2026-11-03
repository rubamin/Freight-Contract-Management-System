import React from "react";
import {
  People,
  LocalShipping,
  Place,
  Scale,
  DirectionsCar,
  Groups,
  ManageAccounts,
  Receipt,
  Assessment,
  Settings,
  Inventory2,
} from "@mui/icons-material";
import { MODULE_KEYS } from "../../constants/modules";

const MODULE_ICONS = {
  [MODULE_KEYS.VENDOR_MASTER]: People,
  [MODULE_KEYS.CONTRACT_MASTER]: LocalShipping,
  [MODULE_KEYS.DESTINATION_MASTER]: Place,
  [MODULE_KEYS.WEIGHT_MASTER]: Scale,
  [MODULE_KEYS.VEHICLE_TYPE_MASTER]: DirectionsCar,
  [MODULE_KEYS.CUSTOMER_MASTER]: Groups,
  [MODULE_KEYS.USER_MASTER]: ManageAccounts,
  [MODULE_KEYS.INVOICES]: Receipt,
  [MODULE_KEYS.REPORTS]: Assessment,
  [MODULE_KEYS.SETTINGS_HIERARCHY]: Settings,
};

// Icon of a module key (same icons as the sidebar).
const ModuleIcon = ({ moduleKey, ...props }) => {
  const Icon = MODULE_ICONS[moduleKey] || Inventory2;
  return <Icon {...props} />;
};

export default ModuleIcon;
