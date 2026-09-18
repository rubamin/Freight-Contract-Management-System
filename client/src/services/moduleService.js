import api from "./api";

const buildModulePath = ({ apiGroup, moduleName }) => {
  return moduleName ? `/${apiGroup}/${moduleName}` : `/${apiGroup}`;
};

export const getRecords = ({ apiGroup, moduleName, params }) => {
  return api.get(buildModulePath({ apiGroup, moduleName }), { params });
};

<<<<<<< HEAD
export const getRecordById = ({ apiGroup, moduleName, id }) => {
  return api.get(`${buildModulePath({ apiGroup, moduleName })}/${id}`);
};

export const createRecord = ({ apiGroup, moduleName, data }) => {
  return api.post(buildModulePath({ apiGroup, moduleName }), data);
};

export const updateRecord = ({ apiGroup, moduleName, id, data }) => {
  return api.put(`${buildModulePath({ apiGroup, moduleName })}/${id}`, data);
};

export const deleteRecord = ({ apiGroup, moduleName, id }) => {
  return api.delete(`${buildModulePath({ apiGroup, moduleName })}/${id}`);
};

export const bulkUploadRecords = ({ apiGroup, moduleName, file }) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`${buildModulePath({ apiGroup, moduleName })}/bulk-upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
=======
export const deleteRecord = ({ apiGroup, moduleName, id }) => {
  return api.delete(`${buildModulePath({ apiGroup, moduleName })}/${id}`);
};
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
