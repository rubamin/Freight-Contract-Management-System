import {
  MIN_IDENTITY_TOKEN_LENGTH,
  PASSWORD_BLOCKED_WORDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../constants/password";

// Mirrors server/helpers/password.js. Drives the live checklist only:
// the server always makes the final decision.

const splitWords = (value) => String(value || "").toLowerCase().split(/[^\p{L}\p{N}]+/u);

// Name parts, the email ID and its parts, and the blocked words. Part of
// one is allowed, the whole string is not.
const forbiddenTokens = (name, email) => {
  const emailId = String(email || "").toLowerCase().split("@")[0];
  const tokens = [...splitWords(name), emailId, ...splitWords(emailId), ...PASSWORD_BLOCKED_WORDS];
  return tokens.filter((token) => token.length >= MIN_IDENTITY_TOKEN_LENGTH);
};

// Every rule with whether the password meets it, in display order.
export const checkPasswordRules = (password, { name, email } = {}) => {
  const value = String(password || "");
  const lowered = value.toLowerCase();
  const containsIdentity = forbiddenTokens(name, email).some((token) => lowered.includes(token));

  return [
    {
      label: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
      met: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    },
    { label: "An upper-case letter", met: /[A-Z]/.test(value) },
    { label: "A lower-case letter", met: /[a-z]/.test(value) },
    { label: "A number", met: /[0-9]/.test(value) },
    { label: "A special character", met: /[^A-Za-z0-9\s]/.test(value) },
    { label: "No spaces", met: value.length > 0 && !/\s/.test(value) },
    { label: "Does not contain your name, login/email ID or the word Rubamin", met: value.length > 0 && !containsIdentity },
  ];
};

// The message to show for a failed auth / password call: the server's
// validation errors if any, otherwise its message.
export const apiErrorMessage = (error, fallback) =>
  error.response?.data?.errors?.join(" ") || error.response?.data?.message || fallback;
