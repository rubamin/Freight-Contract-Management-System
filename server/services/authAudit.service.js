const { writeAuditLog } = require("./crud.service");

// Writes one sign-in / password event to AuditLogs (TableName "Users").
// `actorId` is who did it (the user themself, or the admin), `userId`
// the account it is about. Never throws (see writeAuditLog).
const recordAuthEvent = ({ ip, actorId, userId, actionType, newData = null }) =>
  writeAuditLog({
    req: { user: { UserID: actorId }, ip },
    tableName: "Users",
    recordId: userId,
    actionType,
    newData,
  });

module.exports = { recordAuthEvent };
