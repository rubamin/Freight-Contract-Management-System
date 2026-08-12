import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  data: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard(state) {
      state.data = null;
    },
  },
});

export const { clearDashboard } = dashboardSlice.actions;

export default dashboardSlice.reducer;
