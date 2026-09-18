import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as vendorAPI from "../api/vendorAPI";

/*
|--------------------------------------------------------------------------
| Async Thunks
|--------------------------------------------------------------------------
*/

// Get All Vendors
export const fetchVendors = createAsyncThunk(
  "vendor/fetchVendors",
  async (params, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getVendors(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch vendors"
      );
    }
  }
);

// Get Vendor By ID
export const fetchVendorById = createAsyncThunk(
  "vendor/fetchVendorById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.getVendorById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch vendor"
      );
    }
  }
);

// Create Vendor
export const addVendor = createAsyncThunk(
  "vendor/addVendor",
  async (vendorData, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.createVendor(vendorData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create vendor"
      );
    }
  }
);

// Update Vendor
export const editVendor = createAsyncThunk(
  "vendor/editVendor",
  async ({ id, vendorData }, { rejectWithValue }) => {
    try {
      const response = await vendorAPI.updateVendor(id, vendorData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update vendor"
      );
    }
  }
);

// Delete Vendor
export const removeVendor = createAsyncThunk(
  "vendor/removeVendor",
  async (id, { rejectWithValue }) => {
    try {
      await vendorAPI.deleteVendor(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete vendor"
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| Initial State
|--------------------------------------------------------------------------
*/

const initialState = {
  vendors: [],
  vendor: null,

  loading: false,
  error: null,

  totalRecords: 0,

  page: 1,
  pageSize: 10,

  search: "",

  sortField: "VendorID",
  sortOrder: "DESC",
};

/*
|--------------------------------------------------------------------------
| Slice
|--------------------------------------------------------------------------
*/

const vendorSlice = createSlice({
  name: "vendor",

  initialState,

  reducers: {
    clearVendor(state) {
      state.vendor = null;
    },

    clearError(state) {
      state.error = null;
    },

    setSearch(state, action) {
      state.search = action.payload;
    },

    setPagination(state, action) {
      state.page = action.payload.page;
      state.pageSize = action.payload.pageSize;
    },

    setSorting(state, action) {
      state.sortField = action.payload.sortField;
      state.sortOrder = action.payload.sortOrder;
    },
  },

  extraReducers: (builder) => {
    builder

      // Fetch Vendors
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
      })

      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = action.payload.data;
        state.totalRecords = action.payload.totalRecords;
        state.page = action.payload.page;

state.pageSize = action.payload.pageSize;
      })

      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Vendor
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.vendor = action.payload.data;
      })

      // Create Vendor
      .addCase(addVendor.fulfilled, (state, action) => {
        state.vendors.unshift(action.payload.data);
      })

      // Update Vendor
      .addCase(editVendor.fulfilled, (state, action) => {
        const index = state.vendors.findIndex(
          (x) => x.VendorID === action.payload.data.VendorID
        );

        if (index !== -1) {
          state.vendors[index] = action.payload.data;
        }
      })

      // Delete Vendor
      .addCase(removeVendor.fulfilled, (state, action) => {
        state.vendors = state.vendors.filter(
          (x) => x.VendorID !== action.payload
        );
      });
  },
});

export const {
  clearVendor,
  clearError,
  setSearch,
  setPagination,
  setSorting,
} = vendorSlice.actions;

export default vendorSlice.reducer;