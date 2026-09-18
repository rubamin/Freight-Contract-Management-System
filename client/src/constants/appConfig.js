// Origin of the backend server for building URLs to statically-served files
// (e.g. uploaded profile photos, invoice documents). Kept separate from the
// axios `baseURL` in config/axios.js, which already includes the `/api` prefix.
export const SERVER_ORIGIN = "http://localhost:5000";
