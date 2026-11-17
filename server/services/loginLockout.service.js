// Account lockout: MAX_FAILED_LOGINS wrong passwords in a row lock the
// account for LOCKOUT_MINUTES. Every admin then gets a notification and
// an email (the user gets an email too). The user can wait, or ask IT:
// an admin's "E-mail new password" clears the lock straight away.
//
// Times are worked out on the SQL Server clock (GETDATE()), like every
// other date in this app, so the server's time zone never matters.
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../models");
const { notify, getActiveAdmins } = require("./notification.service");
const { recordAuthEvent } = require("./authAudit.service");
const { sendAccountLockedAdminEmail, sendAccountLockedUserEmail } = require("./authMail.service");
const { MAX_FAILED_LOGINS, LOCKOUT_MINUTES, AUTH_AUDIT_ACTIONS } = require("../constants/password");
const { NOTIFICATION_TYPE_ACCOUNT_LOCKED } = require("../constants/notificationTypes");

const SECONDS_PER_MINUTE = 60;

// Minutes the account is still locked, rounded up (0 = not locked).
const lockMinutesLeft = async (userId) => {
  const [row] = await sequelize.query(
    `SELECT CASE WHEN LockedUntil > GETDATE() THEN DATEDIFF(SECOND, GETDATE(), LockedUntil) ELSE 0 END AS SecondsLeft
     FROM Users WHERE UserID = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  const seconds = Number(row?.SecondsLeft || 0);
  return seconds > 0 ? Math.ceil(seconds / SECONDS_PER_MINUTE) : 0;
};

// Counts one wrong password in a single UPDATE (so two requests at once
// can't both slip past the limit). The attempt that reaches the limit
// sets LockedUntil and restarts the count for after the lock.
// Returns { locked, attemptsLeft, lockedUntilText }.
const recordFailedLogin = async (userId) => {
  const [row] = await sequelize.query(
    `UPDATE Users SET
       FailedLoginCount = CASE WHEN FailedLoginCount + 1 >= :max THEN 0 ELSE FailedLoginCount + 1 END,
       LockedUntil = CASE WHEN FailedLoginCount + 1 >= :max THEN DATEADD(MINUTE, :minutes, GETDATE()) ELSE LockedUntil END
     OUTPUT deleted.FailedLoginCount + 1 AS Attempts,
            CONVERT(varchar(16), inserted.LockedUntil, 120) AS LockedUntilText
     WHERE UserID = :userId`,
    { replacements: { userId, max: MAX_FAILED_LOGINS, minutes: LOCKOUT_MINUTES }, type: QueryTypes.SELECT }
  );
  const attempts = Number(row?.Attempts || 0);
  const locked = attempts >= MAX_FAILED_LOGINS;
  return {
    locked,
    attemptsLeft: locked ? 0 : MAX_FAILED_LOGINS - attempts,
    lockedUntilText: locked ? row.LockedUntilText : null,
  };
};

// Successful sign-in or admin password reset: start counting from zero.
const clearLock = async (user, transaction) => {
  if (!user.FailedLoginCount && !user.LockedUntil) return;
  await user.update({ FailedLoginCount: 0, LockedUntil: null }, { transaction });
};

const describeUser = (user) => `${user.FullName || "A user"} (${user.Email})`;

// Notification + email to every active admin, email to the user. Runs
// after the sign-in reply has been sent; failures are only logged.
const alertAccountLocked = async (user, { ip, lockedUntilText }) => {
  await recordAuthEvent({
    ip,
    actorId: user.UserID,
    userId: user.UserID,
    actionType: AUTH_AUDIT_ACTIONS.ACCOUNT_LOCKED,
    newData: { lockedUntil: lockedUntilText },
  });

  const admins = await getActiveAdmins();
  await notify({
    type: NOTIFICATION_TYPE_ACCOUNT_LOCKED,
    message:
      `Account locked: ${describeUser(user)} entered a wrong password ${MAX_FAILED_LOGINS} times. ` +
      `Locked until ${lockedUntilText}. Use "E-mail new password" on the Users page to unlock it now.`,
    userIds: admins.map((admin) => admin.UserID),
  });

  const details = { name: user.FullName, email: user.Email, lockedUntil: lockedUntilText, ip };
  const adminEmails = admins.map((admin) => admin.Email).filter(Boolean);
  const results = await Promise.allSettled([
    adminEmails.length ? sendAccountLockedAdminEmail({ ...details, to: adminEmails }) : null,
    sendAccountLockedUserEmail(details),
  ]);
  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => console.error("Failed to send an account-locked email:", result.reason?.message));
};

const alertAccountLockedInBackground = (user, details) => {
  alertAccountLocked(user, details).catch((error) =>
    console.error("Failed to send the account-locked alerts:", error.message)
  );
};

module.exports = {
  lockMinutesLeft,
  recordFailedLogin,
  clearLock,
  alertAccountLockedInBackground,
};
