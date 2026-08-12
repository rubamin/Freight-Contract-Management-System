import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as contractAPI from "../api/contractAPI";

export const fetchContracts = createAsyncThunk(
  "contract/fetchContracts",
  async (params, { rejectWithValue }) => {
    try {
      const response = await contractAPI.getContracts(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch contracts"
      );
    }
  }
);

export const fetchContractById = createAsyncThunk(
  "contract/fetchContractById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await contractAPI.getContractById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch contract"
      );
    }
  }
);

export const fetchContractVendors = createAsyncThunk(
  "contract/fetchContractVendors",
  async (_, { rejectWithValue }) => {
    try {
      const response = await contractAPI.getVendors({
        page: 1,
        pageSize: 1000,
        sortField: "VendorName",
        sortOrder: "ASC",
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch vendors"
      );
    }
  }
);

export const fetchContractPlants = createAsyncThunk(
  "contract/fetchContractPlants",
  async (_, { rejectWithValue }) => {
    try {
      const response = await contractAPI.getPlants({
        page: 1,
        pageSize: 1000,
        sortField: "PlantName",
        sortOrder: "ASC",
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch plants"
      );
    }
  }
);

export const addContract = createAsyncThunk(
  "contract/addContract",
  async (contractData, { rejectWithValue }) => {
    try {
      const response = await contractAPI.createContract(contractData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to create contract",
        errors: error.response?.data?.errors || null,
      });
    }
  }
);

export const editContract = createAsyncThunk(
  "contract/editContract",
  async ({ id, contractData }, { rejectWithValue }) => {
    try {
      const response = await contractAPI.updateContract(id, contractData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Failed to update contract",
        errors: error.response?.data?.errors || null,
      });
    }
  }
);

export const removeContract = createAsyncThunk(
  "contract/removeContract",
  async (id, { rejectWithValue }) => {
    try {
      await contractAPI.deleteContract(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete contract"
      );
    }
  }
);

const initialState = {
  contracts: [],
  contract: null,
  vendors: [],
  plants: [],
  totalRecords: 0,
  loading: false,
  saving: false,
  deleting: false,
  error: null,
};

const contractSlice = createSlice({
  name: "contract",
  initialState,
  reducers: {
    clearContractError(state) {
      state.error = null;
    },
    clearSelectedContract(state) {
      state.contract = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContracts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContracts.fulfilled, (state, action) => {
        state.loading = false;
        state.contracts = action.payload.data || [];
        state.totalRecords = action.payload.totalRecords || 0;
      })
      .addCase(fetchContracts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContractById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContractById.fulfilled, (state, action) => {
        state.loading = false;
        state.contract = action.payload.data;
      })
      .addCase(fetchContractById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContractVendors.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContractVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = action.payload.data || [];
      })
      .addCase(fetchContractVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchContractPlants.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContractPlants.fulfilled, (state, action) => {
        state.loading = false;
        state.plants = action.payload.data || [];
      })
      .addCase(fetchContractPlants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addContract.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(addContract.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(addContract.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload?.message || action.payload;
      })
      .addCase(editContract.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(editContract.fulfilled, (state, action) => {
        state.saving = false;
        state.contract = action.payload.data;
      })
      .addCase(editContract.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload?.message || action.payload;
      })
      .addCase(removeContract.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(removeContract.fulfilled, (state, action) => {
        state.deleting = false;
        state.contracts = state.contracts.filter(
          (contract) => contract.ContractID !== action.payload
        );
      })
      .addCase(removeContract.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      });
  },
});

export const { clearContractError, clearSelectedContract } =
  contractSlice.actions;

export default contractSlice.reducer;
