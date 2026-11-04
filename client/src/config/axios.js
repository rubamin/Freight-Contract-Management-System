import axios from "axios";
import { clearStoredAuth, getStoredToken } from "../utils/storage";
import { PASSWORD_CHANGE_REQUIRED } from "../constants/password";

const api = axios.create({
    baseURL: "http://localhost:5003/api",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Sign-in and password forms answer a wrong password or code with an
// error the page shows itself, so these calls never sign the user out
// or reload the page.
const AUTH_FORM_PATHS = [
    "/auth/login",
    "/auth/set-password",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/users/change-password",
];
const LOGIN_PATH = "/login";
const SET_PASSWORD_PATH = "/set-password";

const isAuthFormCall = (config) => AUTH_FORM_PATHS.includes(config?.url);

const goTo = (path) => {
    if (window.location.pathname !== path) {
        window.location.assign(path);
    }
};

api.interceptors.request.use((config) => {
    const token = getStoredToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// An expired / ended session goes back to the sign-in page; a user who
// must set a new password first goes to that page.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        if (status === 401 && !isAuthFormCall(error.config) && getStoredToken()) {
            clearStoredAuth();
            goTo(LOGIN_PATH);
        } else if (status === 403 && error.response.data?.code === PASSWORD_CHANGE_REQUIRED && getStoredToken()) {
            goTo(SET_PASSWORD_PATH);
        }
        return Promise.reject(error);
    }
);

export default api;
