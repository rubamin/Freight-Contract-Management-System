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

export const fetchModuleRecordById = createAsyncThunk(
  "module/fetchModuleRecordById",
  async ({ config, id }, { rejectWithValue }) => {
    try {
      const response = await moduleService.getRecordById({
        apiGroup: config.apiGroup,
        moduleName: config.moduleName,
        id,
      });

      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch record"
      );
    }
  }
);

export const createModuleRecord = createAsyncThunk(
  "module/createModuleRecord",
  async ({ config, data }, { rejectWithValue }) => {
    try {
      const response = await moduleService.createRecord({
        apiGroup: config.apiGroup,
        moduleName: config.moduleName,
        data,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create record"
      );
    }
  }
);

export const updateModuleRecord = createAsyncThunk(
  "module/updateModuleRecord",
  async ({ config, id, data }, { rejectWithValue }) => {
    try {
      const response = await moduleService.updateRecord({
        apiGroup: config.apiGroup,
        moduleName: config.moduleName,
        id,
        data,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update record"
      );
    }
  }
);

const initialState = {
  recordsByModule: {},
  totalRecordsByModule: {},
  currentRecord: null,
  loading: false,
  saving: false,
  error: null,
};

const moduleSlice = createSlice({
  name: "module",
  initialState,
  reducers: {
    clearModuleError(state) {
      state.error = null;
    },
    clearCurrentModuleRecord(state) {
      state.currentRecord = null;
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
      })
      .addCase(fetchModuleRecordById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchModuleRecordById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecord = action.payload;
      })
      .addCase(fetchModuleRecordById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createModuleRecord.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createModuleRecord.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(createModuleRecord.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateModuleRecord.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateModuleRecord.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(updateModuleRecord.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { clearModuleError, clearCurrentModuleRecord } = moduleSlice.actions;

export default moduleSlice.reducer;
