import api from "./api";

const BASE_PATH = "/database-maintenance/modules";

export const getMaintenanceModules = () => api.get(BASE_PATH);

export const runMaintenance = ({ moduleKey, action, confirmation }) =>
  api.post(`${BASE_PATH}/${moduleKey}`, { action, confirmation });
