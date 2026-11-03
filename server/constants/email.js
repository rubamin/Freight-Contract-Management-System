// Shared email-related constants used across controllers.

// Frontend base URL used for links inside emails (APP_URL, or the older
// CLIENT_URL). Use the server's LAN IP or domain, not localhost.
const CLIENT_URL = (process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

module.exports = { CLIENT_URL };
