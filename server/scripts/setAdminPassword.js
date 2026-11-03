// Lets the main Admin set their own password from the server, e.g. before
// SMTP works and the emailed temporary password can't arrive. The
// password is typed twice (hidden) and must meet the normal rules.
//
// Usage (from the server folder):
//   node scripts/setAdminPassword.js admin@company.com
const path = require("path");
const readline = require("readline");
const { Writable } = require("stream");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { sequelize, User, Role } = require("../models");
const { isAdminRole } = require("../constants/roles");
const { AUTH_AUDIT_ACTIONS } = require("../constants/password");
const { recordAuthEvent } = require("../services/authAudit.service");
const {
  findNewPasswordProblems,
  describePasswordProblems,
  replacePassword,
} = require("../services/password.service");

const askHidden = (question) => {
  process.stdout.write(question);
  const silentOutput = new Writable({ write: (chunk, encoding, callback) => callback() });
  const prompt = readline.createInterface({ input: process.stdin, output: silentOutput, terminal: true });

  return new Promise((resolve) => {
    prompt.question("", (answer) => {
      prompt.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
};

const findAdmin = async (email) => {
  const user = await User.findOne({ where: { Email: email }, include: [{ model: Role, as: "role" }] });
  if (!user || !user.IsActive) {
    throw new Error(`No active user with the email ${email}.`);
  }
  if (!isAdminRole(user.role?.RoleName)) {
    throw new Error("This script is only for an Admin account. Other users get their password by email.");
  }
  return user;
};

const readNewPassword = async (user) => {
  const password = await askHidden("New password: ");
  const repeated = await askHidden("Repeat new password: ");
  if (password !== repeated) {
    throw new Error("The two passwords do not match. Nothing was changed.");
  }

  const problems = await findNewPasswordProblems(user, password);
  if (problems.length > 0) {
    throw new Error(`${describePasswordProblems(problems)} Nothing was changed.`);
  }
  return password;
};

const main = async () => {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: node scripts/setAdminPassword.js <email>");
  }

  const user = await findAdmin(email);
  const password = await readNewPassword(user);

  await sequelize.transaction((transaction) =>
    replacePassword(user, password, { mustChange: false, transaction })
  );
  await recordAuthEvent({
    ip: "server script",
    actorId: user.UserID,
    userId: user.UserID,
    actionType: AUTH_AUDIT_ACTIONS.PASSWORD_SET_BY_SCRIPT,
  });

  console.log(`Password set for ${user.Email}. Sign in with it now.`);
};

main()
  .then(() => 0, (error) => {
    console.error(error.message);
    return 1;
  })
  .then(async (exitCode) => {
    await sequelize.close();
    process.exit(exitCode);
  });
