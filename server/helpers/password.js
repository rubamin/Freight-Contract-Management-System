const crypto = require("crypto");
const {
  PASSWORD_MIN_LENGTH,
  MIN_IDENTITY_TOKEN_LENGTH,
  TEMP_PASSWORD_LENGTH,
  TEMP_PASSWORD_SETS,
} = require("../constants/password");

// Labels match the live checklist on the screen
// (client/src/utils/passwordRules.js) word for word.
const IDENTITY_RULE = "Does not contain your name or email ID";

const CHARACTER_RULES = [
  { label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { label: "An upper-case letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lower-case letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A special character", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { label: "No spaces", test: (p) => !/\s/.test(p) },
];

// Name parts and the email ID (the part before "@"), lower-cased, that a
// password must not contain.
const identityTokens = ({ name, email }) => {
  const nameParts = String(name || "").toLowerCase().split(/[^\p{L}\p{N}]+/u);
  const emailId = String(email || "").toLowerCase().split("@")[0];
  return [...nameParts, emailId].filter((token) => token.length >= MIN_IDENTITY_TOKEN_LENGTH);
};

// Returns the label of every rule the password breaks (empty = valid).
// Reuse of the current / a recent password is checked separately in
// password.service.js because it needs the database.
const findPasswordProblems = (password, identity) => {
  const value = String(password || "");
  const problems = CHARACTER_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label);
  const lowered = value.toLowerCase();
  if (identityTokens(identity).some((token) => lowered.includes(token))) {
    problems.push(IDENTITY_RULE);
  }
  return problems;
};

const pickRandom = (characters) => characters[crypto.randomInt(characters.length)];

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Random temporary password: TEMP_PASSWORD_LENGTH characters with at
// least one upper-case letter, lower-case letter, number and special
// character, and no look-alike characters.
const generateTempPassword = () => {
  const sets = Object.values(TEMP_PASSWORD_SETS);
  const allCharacters = sets.join("");
  const characters = sets.map(pickRandom);
  while (characters.length < TEMP_PASSWORD_LENGTH) {
    characters.push(pickRandom(allCharacters));
  }
  return shuffle(characters).join("");
};

module.exports = { findPasswordProblems, generateTempPassword };
