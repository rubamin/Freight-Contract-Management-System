const crypto = require("crypto");
const { QueryTypes, literal } = require("sequelize");
const { sequelize, PasswordOtp } = require("../models");
const { comparePassword, hashPassword } = require("../helpers/bcrpt");
const {
  OTP_LENGTH,
  OTP_VALID_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MIN_INTERVAL_SECONDS,
  OTP_MAX_PER_HOUR,
  OTP_PURPOSE,
} = require("../constants/password");
const { PASSWORD_RESET_INVALID_CODE_MESSAGE } = require("../constants/messages");

const PURPOSE = OTP_PURPOSE.FORGOT_PASSWORD;
const TOO_MANY_ATTEMPTS_MESSAGE = "Too many wrong attempts. Request a new code.";
const NOW = "GETDATE()";

// True when a new code may be sent: none in the last
// OTP_MIN_INTERVAL_SECONDS and fewer than OTP_MAX_PER_HOUR in the last
// hour. Compared in SQL so the database clock is the only clock used.
// The offset is passed already negative: Sequelize does not substitute a
// placeholder written as "-:name".
const canIssueOtp = async (userId) => {
  const [row] = await sequelize.query(
    `SELECT
       COUNT(*) AS LastHour,
       SUM(CASE WHEN [createdAt] > DATEADD(SECOND, :intervalOffset, GETDATE()) THEN 1 ELSE 0 END) AS LastInterval
     FROM [dbo].[PasswordOtps]
     WHERE [UserID] = :userId AND [Purpose] = :purpose
       AND [createdAt] > DATEADD(HOUR, -1, GETDATE())`,
    {
      type: QueryTypes.SELECT,
      replacements: { userId, purpose: PURPOSE, intervalOffset: -OTP_MIN_INTERVAL_SECONDS },
    }
  );
  return !row.LastInterval && row.LastHour < OTP_MAX_PER_HOUR;
};

// Cancels any open code for the user and stores a new one (hash only)
// inside `transaction`. Returns the plain code so it can be emailed.
const issueOtp = async (userId, transaction) => {
  const code = String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

  await PasswordOtp.update(
    { UsedAt: literal(NOW), updatedAt: literal(NOW) },
    { where: { UserID: userId, Purpose: PURPOSE, UsedAt: null }, transaction }
  );
  await PasswordOtp.create(
    {
      UserID: userId,
      Purpose: PURPOSE,
      OtpHash: await hashPassword(code),
      ExpiresAt: literal(`DATEADD(MINUTE, ${OTP_VALID_MINUTES}, GETDATE())`),
    },
    { transaction }
  );
  return code;
};

const loadOpenOtp = (userId) =>
  PasswordOtp.findOne({
    where: { UserID: userId, Purpose: PURPOSE, UsedAt: null },
    attributes: {
      include: [[literal("CASE WHEN [ExpiresAt] > GETDATE() THEN 0 ELSE 1 END"), "IsExpired"]],
    },
    order: [["createdAt", "DESC"], ["PasswordOtpID", "DESC"]],
  });

const countWrongAttempt = (otpId) =>
  PasswordOtp.update(
    { Attempts: literal("[Attempts] + 1"), updatedAt: literal(NOW) },
    { where: { PasswordOtpID: otpId } }
  );

// Checks a code against the user's open code. A wrong code counts as an
// attempt. Returns { otpId } on success or { error } with a message.
const checkOtp = async (userId, code) => {
  const otp = await loadOpenOtp(userId);
  if (!otp || Number(otp.get("IsExpired")) === 1) return { error: PASSWORD_RESET_INVALID_CODE_MESSAGE };
  if (otp.Attempts >= OTP_MAX_ATTEMPTS) return { error: TOO_MANY_ATTEMPTS_MESSAGE };

  if (await comparePassword(String(code), otp.OtpHash)) return { otpId: otp.PasswordOtpID };

  await countWrongAttempt(otp.PasswordOtpID);
  const attemptsLeft = OTP_MAX_ATTEMPTS - otp.Attempts - 1;
  return {
    error: attemptsLeft > 0 ? `The code is incorrect. ${attemptsLeft} attempt(s) left.` : TOO_MANY_ATTEMPTS_MESSAGE,
  };
};

// Marks the code used inside `transaction`. Returns false when it was
// already used (e.g. two submits at once), so a code only works once.
const markOtpUsed = async (otpId, transaction) => {
  const [affectedRows] = await PasswordOtp.update(
    { UsedAt: literal(NOW), updatedAt: literal(NOW) },
    { where: { PasswordOtpID: otpId, UsedAt: null }, transaction }
  );
  return affectedRows === 1;
};

module.exports = { canIssueOtp, issueOtp, checkOtp, markOtpUsed };
