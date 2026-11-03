import api from "./api";

// Destinations of the vendor's ACTIVE contract of the given type:
// { contractId, contractNo, destinations: ["City", ...] }.
export const getContractDestinations = (vendorId, contractType) =>
  api.get("/invoices/contract-destinations", { params: { vendorId, contractType } }).then((res) => res.data.data);
