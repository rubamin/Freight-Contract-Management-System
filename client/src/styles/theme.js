import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: "#1E3A8A",
      light: "#3B82F6",
      dark: "#1E40AF",
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#2563EB",
      light: "#60A5FA",
      dark: "#1D4ED8",
      contrastText: "#FFFFFF",
    },

    background: {
      default: "#F4F7FC",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#1F2937",
      secondary: "#6B7280",
    },

    divider: "#E5E7EB",

    success: {
      main: "#16A34A",
    },

    warning: {
      main: "#F59E0B",
    },

    error: {
      main: "#DC2626",
    },

    info: {
      main: "#0284C7",
    },
  },

  shape: {
    borderRadius: 12,
  },

  typography: {
    fontFamily: [
      "Poppins",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),

    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
    },

    h2: {
      fontSize: "2rem",
      fontWeight: 700,
    },

    h3: {
      fontSize: "1.75rem",
      fontWeight: 700,
    },

    h4: {
      fontSize: "1.5rem",
      fontWeight: 700,
    },

    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },

    h6: {
      fontSize: "1rem",
      fontWeight: 600,
    },

    subtitle1: {
      fontWeight: 500,
    },

    body1: {
      fontSize: "0.95rem",
    },

    body2: {
      fontSize: "0.875rem",
      color: "#6B7280",
    },

    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shadows: [
    "none",
    "0 2px 6px rgba(15,23,42,0.05)",
    "0 4px 10px rgba(15,23,42,0.06)",
    "0 6px 14px rgba(15,23,42,0.07)",
    "0 8px 18px rgba(15,23,42,0.08)",
    "0 10px 22px rgba(15,23,42,0.09)",
    "0 12px 26px rgba(15,23,42,0.10)",
    "0 14px 30px rgba(15,23,42,0.11)",
    "0 16px 34px rgba(15,23,42,0.12)",
    "0 18px 38px rgba(15,23,42,0.13)",
    "0 20px 42px rgba(15,23,42,0.14)",
    "0 22px 46px rgba(15,23,42,0.15)",
    "0 24px 50px rgba(15,23,42,0.16)",
    "0 26px 54px rgba(15,23,42,0.17)",
    "0 28px 58px rgba(15,23,42,0.18)",
    "0 30px 62px rgba(15,23,42,0.19)",
    "0 32px 66px rgba(15,23,42,0.20)",
    "0 34px 70px rgba(15,23,42,0.21)",
    "0 36px 74px rgba(15,23,42,0.22)",
    "0 38px 78px rgba(15,23,42,0.23)",
    "0 40px 82px rgba(15,23,42,0.24)",
    "0 42px 86px rgba(15,23,42,0.25)",
    "0 44px 90px rgba(15,23,42,0.26)",
    "0 46px 94px rgba(15,23,42,0.27)",
    "0 48px 98px rgba(15,23,42,0.28)",
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F4F7FC",
          margin: 0,
          padding: 0,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },

      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 42,
          fontWeight: 600,
          paddingLeft: 18,
          paddingRight: 18,
        },

        containedPrimary: {
          "&:hover": {
            backgroundColor: "#1E40AF",
          },
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          background: "#FFFFFF",
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F8FAFC",
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        },
      },
    },
  },
});

export default theme;