import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import vendorReducer from "./slices/vendorSlice";
import moduleReducer from "./slices/moduleSlice";
import contractReducer from "./slices/contractSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    vendor: vendorReducer,
    module: moduleReducer,
    contract: contractReducer,
  },
});

export default store;
