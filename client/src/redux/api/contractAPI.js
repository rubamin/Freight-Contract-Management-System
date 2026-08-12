import api from "../../services/api";
import { API_ENDPOINTS } from "../../constants/apiEndpoints";

export const getVendors = (params) =>
  api.get(API_ENDPOINTS.VENDORS, { params });

export const getPlants = (params) =>
  api.get(`${API_ENDPOINTS.MASTERS}/plants`, { params });

export const getContracts = (params) =>
  api.get(API_ENDPOINTS.CONTRACTS, { params });

export const getContractById = (id) =>
  api.get(`${API_ENDPOINTS.CONTRACTS}/${id}`);

export const createContract = (data) =>
  api.post(API_ENDPOINTS.CONTRACTS, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updateContract = (id, data) =>
  api.put(`${API_ENDPOINTS.CONTRACTS}/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const deleteContract = (id) =>
  api.delete(`${API_ENDPOINTS.CONTRACTS}/${id}`);

export const getContractDownloadUrl = ({ id, type }) =>
  `${api.defaults.baseURL}${API_ENDPOINTS.CONTRACTS}/${id}/download/${type}`;
