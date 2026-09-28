import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as moduleService from "../../services/moduleService";

export const fetchModuleRecords = createAsyncThunk(
  "module/fetchModuleRecords",
  async ({ config, params }, { rejectWithValue }) => {
    try {
      const response = await moduleService.getRecords({
        apiGroup: config.apiGroup,
        moduleName: config.moduleName,
        params,
      });

      return {
        key: config.stateKey || config.moduleName,
        ...response.data,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch records"
      );
    }
  }
);

export const removeModuleRecord = createAsyncThunk(
  "module/removeModuleRecord",
  async ({ config, id }, { rejectWithValue }) => {
    try {
      await moduleService.deleteRecord({
        apiGroup: config.apiGroup,
        moduleName: config.moduleName,
        id,
      });

      return {
        key: config.stateKey || config.moduleName,
        idField: config.idField,
        id,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete record"
      );
    }
  }
);

const initialState = {
  recordsByModule: {},
  totalRecordsByModule: {},
  loading: false,

  error: null,
};

const moduleSlice = createSlice({
  name: "module",
  initialState,
  reducers: {
    clearModuleError(state) {
      state.error = null;
    },

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModuleRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModuleRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.recordsByModule[action.payload.key] = action.payload.data;
        state.totalRecordsByModule[action.payload.key] =
          action.payload.totalRecords;
      })
      .addCase(fetchModuleRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(removeModuleRecord.fulfilled, (state, action) => {
        const records = state.recordsByModule[action.payload.key] || [];
        state.recordsByModule[action.payload.key] = records.filter(
          (record) =>
            record[action.payload.idField] !== action.payload.id
        );

      });
  },
});

export const { clearModuleError } = moduleSlice.actions;


export default moduleSlice.reducer;
