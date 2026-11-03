import { MIN_IDENTITY_TOKEN_LENGTH, PASSWORD_MIN_LENGTH } from "../constants/password";

// Mirrors server/helpers/password.js. Drives the live checklist only:
// the server always makes the final decision.

const identityTokens = (name, email) => {
  const nameParts = String(name || "").toLowerCase().split(/[^\p{L}\p{N}]+/u);
  const emailId = String(email || "").toLowerCase().split("@")[0];
  return [...nameParts, emailId].filter((token) => token.length >= MIN_IDENTITY_TOKEN_LENGTH);
};

// Every rule with whether the password meets it, in display order.
export const checkPasswordRules = (password, { name, email } = {}) => {
  const value = String(password || "");
  const lowered = value.toLowerCase();
  const containsIdentity = identityTokens(name, email).some((token) => lowered.includes(token));

  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: value.length >= PASSWORD_MIN_LENGTH },
    { label: "An upper-case letter", met: /[A-Z]/.test(value) },
    { label: "A lower-case letter", met: /[a-z]/.test(value) },
    { label: "A number", met: /[0-9]/.test(value) },
    { label: "A special character", met: /[^A-Za-z0-9\s]/.test(value) },
    { label: "No spaces", met: value.length > 0 && !/\s/.test(value) },
    { label: "Does not contain your name or email ID", met: value.length > 0 && !containsIdentity },
  ];
};

// The message to show for a failed auth / password call: the server's
// validation errors if any, otherwise its message.
export const apiErrorMessage = (error, fallback) =>
  error.response?.data?.errors?.join(" ") || error.response?.data?.message || fallback;
