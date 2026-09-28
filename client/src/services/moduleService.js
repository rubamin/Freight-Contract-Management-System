import api from "./api";

const buildModulePath = ({ apiGroup, moduleName }) => {
  return moduleName ? `/${apiGroup}/${moduleName}` : `/${apiGroup}`;
};

export const getRecords = ({ apiGroup, moduleName, params }) => {
  return api.get(buildModulePath({ apiGroup, moduleName }), { params });
};

export const deleteRecord = ({ apiGroup, moduleName, id }) => {
  return api.delete(`${buildModulePath({ apiGroup, moduleName })}/${id}`);
};

