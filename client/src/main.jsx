import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";

import {
  CssBaseline,
  ThemeProvider,
} from "@mui/material";

import { StyledEngineProvider } from "@mui/material/styles";

import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

import "./styles/global.css";

import App from "./App";
import store from "./redux/store";
import theme from "./styles/theme";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
    </Provider>
  </React.StrictMode>
);