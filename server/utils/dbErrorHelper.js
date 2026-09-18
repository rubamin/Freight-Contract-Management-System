// Reusable helper for identifying database foreign key violations without
// exposing raw SQL/tedious error text to API clients.

/**
 * Checks whether a Sequelize/mssql error is a foreign key constraint
 * violation referencing the given table name.
 *
 * @param {Error} error - Error thrown by a Sequelize query.
 * @param {string} referencedTableName - Table name the foreign key points to (e.g. "Plants").
 * @returns {boolean}
 */
const isForeignKeyViolationForTable = (error, referencedTableName) => {
  const rawMessage = error?.original?.message || error?.message || "";
  return (
    rawMessage.includes("FOREIGN KEY") &&
    rawMessage.includes(referencedTableName)
  );
};

/**
 * Sequelize's SequelizeValidationError/SequelizeUniqueConstraintError both
 * expose their real cause on error.errors[] (e.g. "City must be unique"),
 * but their own top-level .message is just the generic string
 * "Validation error" - which is what error.message returns unless this is
 * unwrapped. This surfaces the actual per-field reason instead.
 *
 * @param {Error} error - Error thrown by a Sequelize query.
 * @returns {string} A message safe and useful to show the API caller.
 */
const describeSequelizeError = (error) => {
  if (Array.isArray(error?.errors) && error.errors.length > 0) {
    return error.errors.map((item) => item.message).join(" ");
  }
  return error?.original?.message || error?.message || "An unexpected error occurred.";
};

module.exports = { isForeignKeyViolationForTable, describeSequelizeError };