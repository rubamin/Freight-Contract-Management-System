const { Op, literal } = require("sequelize");
const { PasswordHistory } = require("../models");
const { comparePassword, hashPassword } = require("../helpers/bcrpt");
const { findPasswordProblems } = require("../helpers/password");
const { PASSWORD_HISTORY_DEPTH } = require("../constants/password");
const { HttpError } = require("../utils/httpError");

const CURRENT_PASSWORD_RULE = "Not your current password";
const RECENT_PASSWORD_RULE = `Not one of your last ${PASSWORD_HISTORY_DEPTH} passwords`;
const NEWEST_FIRST = [["createdAt", "DESC"], ["PasswordHistoryID", "DESC"]];

const matchesAnyHash = async (password, hashes) => {
  const results = await Promise.all(hashes.filter(Boolean).map((hash) => comparePassword(password, hash)));
  return results.some(Boolean);
};

const loadRecentHashes = async (userId) => {
  const rows = await PasswordHistory.findAll({
    where: { UserID: userId },
    attributes: ["PasswordHash"],
    order: NEWEST_FIRST,
    limit: PASSWORD_HISTORY_DEPTH,
  });
  return rows.map((row) => row.PasswordHash);
};

// Every rule the new password breaks for this user, including reuse of
// the current or a recent password. Empty array = allowed.
const findNewPasswordProblems = async (user, newPassword) => {
  const problems = findPasswordProblems(newPassword, { name: user.FullName, email: user.Email });
  if (await matchesAnyHash(newPassword, [user.PasswordHash])) {
    problems.push(CURRENT_PASSWORD_RULE);
  } else if (await matchesAnyHash(newPassword, await loadRecentHashes(user.UserID))) {
    problems.push(RECENT_PASSWORD_RULE);
  }
  return problems;
};

const describePasswordProblems = (problems) =>
  `The new password does not meet these rules: ${problems.join("; ")}.`;

// Throws HttpError(400) listing every rule the new password breaks.
const assertNewPasswordAllowed = async (user, newPassword) => {
  const problems = await findNewPasswordProblems(user, newPassword);
  if (problems.length > 0) {
    throw new HttpError(400, describePasswordProblems(problems));
  }
};

const archivePassword = async (userId, passwordHash, transaction) => {
  await PasswordHistory.create({ UserID: userId, PasswordHash: passwordHash }, { transaction });

  const kept = await PasswordHistory.findAll({
    where: { UserID: userId },
    attributes: ["PasswordHistoryID"],
    order: NEWEST_FIRST,
    limit: PASSWORD_HISTORY_DEPTH,
    transaction,
  });
  await PasswordHistory.destroy({
    where: { UserID: userId, PasswordHistoryID: { [Op.notIn]: kept.map((row) => row.PasswordHistoryID) } },
    transaction,
  });
};

// Replaces the user's password inside `transaction`. The old hash goes
// into PasswordHistories, PasswordChangedAt moves forward (which ends
// every older session) and MustChangePassword is set as given. The user
// is reloaded so PasswordChangedAt holds the stored value.
const replacePassword = async (user, newPassword, { mustChange, transaction }) => {
  if (user.PasswordHash) {
    await archivePassword(user.UserID, user.PasswordHash, transaction);
  }

  await user.update(
    {
      PasswordHash: await hashPassword(newPassword),
      MustChangePassword: mustChange,
      PasswordChangedAt: literal("GETDATE()"),
    },
    { transaction }
  );
  await user.reload({ transaction });
  return user;
};

module.exports = {
  findNewPasswordProblems,
  describePasswordProblems,
  assertNewPasswordAllowed,
  replacePassword,
};
