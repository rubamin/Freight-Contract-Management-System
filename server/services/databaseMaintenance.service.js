const { QueryTypes } = require("sequelize");
const { sequelize } = require("../models");
const { ADMIN_ROLE_NAME } = require("../constants/roles");
const {
  MAINTENANCE_ACTIONS,
  MAINTENANCE_AUDIT_ACTIONS,
  MAINTENANCE_MODULES,
  getMaintenanceModuleLabel,
} = require("../constants/databaseMaintenance");
const { writeAuditLog } = require("./crud.service");

const DB_SCHEMA = "dbo";

const quoteName = (name) => `[${String(name).replace(/]/g, "]]")}]`;
const qualify = (table) => `${quoteName(DB_SCHEMA)}.${quoteName(table)}`;

const selectRows = (sql, transaction, replacements = {}) =>
  sequelize.query(sql, { type: QueryTypes.SELECT, transaction, replacements });

const runStatement = (sql, transaction) => sequelize.query(sql, { transaction });

const getModuleConfig = (moduleKey) => {
  const config = MAINTENANCE_MODULES[moduleKey];
  if (!config) {
    const error = new Error("This module is not available for database maintenance.");
    error.statusCode = 404;
    throw error;
  }
  return config;
};

const getPreservedAdminIds = async (transaction) => {
  const rows = await selectRows(
    `SELECT u.[UserID] AS UserID
       FROM ${qualify("Users")} u
       JOIN ${qualify("Roles")} r ON r.[RoleID] = u.[RoleID]
      WHERE LOWER(r.[RoleName]) = LOWER(:adminRoleName)`,
    transaction,
    { adminRoleName: ADMIN_ROLE_NAME }
  );
  return rows.map((row) => Number(row.UserID)).filter(Number.isInteger);
};

// Integer IDs read back from the database, so safe to inline.
const buildNotInClause = (column, ids) =>
  ids.length ? `${quoteName(column)} NOT IN (${ids.join(",")})` : null;

const buildStepWhere = (step, preservedIds) => {
  const conditions = [step.where, buildNotInClause("UserID", preservedIds)].filter(Boolean);
  return conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
};

const countStepRows = async (step, preservedIds, transaction) => {
  const [row] = await selectRows(
    `SELECT COUNT(*) AS total FROM ${qualify(step.table)}${buildStepWhere(step, preservedIds)}`,
    transaction
  );
  return Number(row.total);
};

const findTableOwnerKey = (table) =>
  Object.keys(MAINTENANCE_MODULES).find((key) =>
    MAINTENANCE_MODULES[key].steps.some((step) => step.table === table)
  );

const getIncomingForeignKeys = async (tables, transaction) => {
  return await selectRows(
    `SELECT OBJECT_NAME(fk.parent_object_id) AS referencingTable,
            COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS referencingColumn,
            OBJECT_NAME(fk.referenced_object_id) AS referencedTable
       FROM sys.foreign_keys fk
       JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
      WHERE fk.is_disabled = 0
        AND OBJECT_NAME(fk.referenced_object_id) IN (:tables)`,
    transaction,
    { tables }
  );
};

const countReferencingRows = async (foreignKey, preservedIds, transaction) => {
  const conditions = [`${quoteName(foreignKey.referencingColumn)} IS NOT NULL`];
  if (foreignKey.referencedTable === "Users") {
    const notIn = buildNotInClause(foreignKey.referencingColumn, preservedIds);
    if (notIn) conditions.push(notIn);
  }
  const [row] = await selectRows(
    `SELECT COUNT(*) AS total FROM ${qualify(foreignKey.referencingTable)} WHERE ${conditions.join(" AND ")}`,
    transaction
  );
  return Number(row.total);
};

// Rows in other modules that still point at this module's rows. Any such
// row would make the delete fail on a foreign key, so it is reported up
// front with the module that has to be cleared first.
const findBlockingReferences = async (config, preservedIds, transaction) => {
  const moduleTables = config.steps.map((step) => step.table);
  const foreignKeys = await getIncomingForeignKeys(moduleTables, transaction);
  const externalKeys = foreignKeys.filter((fk) => !moduleTables.includes(fk.referencingTable));

  const blockers = [];
  for (const foreignKey of externalKeys) {
    const rowCount = await countReferencingRows(foreignKey, preservedIds, transaction);
    if (rowCount > 0) {
      blockers.push({
        moduleKey: findTableOwnerKey(foreignKey.referencingTable) || null,
        module: getMaintenanceModuleLabel(
          findTableOwnerKey(foreignKey.referencingTable) || foreignKey.referencingTable
        ),
        table: foreignKey.referencingTable,
        column: foreignKey.referencingColumn,
        references: foreignKey.referencedTable,
        rowCount,
      });
    }
  }
  return blockers;
};

const describeBlockers = (moduleLabel, blockers) => {
  const details = blockers
    .map((b) => `${b.module} (${b.table}.${b.column}: ${b.rowCount} rows)`)
    .join(", ");
  return `${moduleLabel} cannot be cleared because other data still references it: ${details}. Clear those modules first.`;
};

const resolvePreservedIds = async (config, transaction) =>
  config.preserveAdmins ? await getPreservedAdminIds(transaction) : [];

const createTruncatePlan = (moduleKey, summaries) => {
  const summaryByKey = new Map(summaries.map((summary) => [summary.key, summary]));
  const visiting = new Set();
  const visited = new Set();
  const order = [];
  let error = null;

  const visit = (key) => {
    if (visited.has(key) || error) return;
    if (visiting.has(key)) {
      error = "A dependency cycle prevents these modules from being safely truncated together.";
      return;
    }

    const summary = summaryByKey.get(key);
    if (!summary) {
      error = "A dependent module is not available for database maintenance.";
      return;
    }

    visiting.add(key);
    for (const blocker of summary.blockers) {
      if (!blocker.moduleKey) {
        error = `${blocker.module} contains data that references this module and cannot be cleared automatically.`;
        break;
      }
      visit(blocker.moduleKey);
      if (error) break;
    }
    visiting.delete(key);

    if (!error) {
      visited.add(key);
      order.push(key);
    }
  };

  visit(moduleKey);
  return { order, error };
};

const buildModuleSummary = async (moduleKey, transaction) => {
  const config = MAINTENANCE_MODULES[moduleKey];
  const preservedIds = await resolvePreservedIds(config, transaction);

  const tables = [];
  for (const step of config.steps) {
    tables.push({ table: step.table, rowCount: await countStepRows(step, preservedIds, transaction) });
  }

  return {
    key: moduleKey,
    label: getMaintenanceModuleLabel(moduleKey),
    tables,
    totalRows: tables.reduce((sum, t) => sum + t.rowCount, 0),
    preservedAdminCount: config.preserveAdmins ? preservedIds.length : 0,
    blockers: await findBlockingReferences(config, preservedIds, transaction),
  };
};

const getModuleSummaries = async () => {
  const summaries = [];
  for (const moduleKey of Object.keys(MAINTENANCE_MODULES)) {
    summaries.push(await buildModuleSummary(moduleKey));
  }
  return summaries.map((summary) => {
    const plan = createTruncatePlan(summary.key, summaries);
    return {
      ...summary,
      truncateDependencies: plan.order
        .filter((key) => key !== summary.key)
        .map((key) => ({ key, label: getMaintenanceModuleLabel(key) })),
      truncateUnavailableReason: plan.error,
    };
  });
};

const getIdentityColumn = async (table, transaction) => {
  const [identity] = await selectRows(
    `SELECT name AS columnName, CAST(last_value AS BIGINT) AS lastValue
       FROM sys.identity_columns
      WHERE object_id = OBJECT_ID(:name)`,
    transaction,
    { name: `${DB_SCHEMA}.${table}` }
  );
  return identity || null;
};

// DBCC CHECKIDENT RESEED n makes the next value n + 1 on a table that has
// ever held rows, but n itself on a table that never has. Tables that keep
// rows (preserved admins, non-invoice notifications) continue after their
// highest remaining ID instead.
const computeReseedValue = async (table, identity, transaction) => {
  const [usage] = await selectRows(
    `SELECT COUNT(*) AS remaining, MAX(${quoteName(identity.columnName)}) AS maxId FROM ${qualify(table)}`,
    transaction
  );
  if (Number(usage.remaining) > 0) {
    return { reseedValue: Number(usage.maxId), nextId: Number(usage.maxId) + 1 };
  }

  const neverUsed = identity.lastValue === null || identity.lastValue === undefined;
  return { reseedValue: neverUsed ? 1 : 0, nextId: 1 };
};

const resetIdentity = async (table, transaction) => {
  const identity = await getIdentityColumn(table, transaction);
  if (!identity) return null;

  const { reseedValue, nextId } = await computeReseedValue(table, identity, transaction);
  await runStatement(
    `DBCC CHECKIDENT ('${DB_SCHEMA}.${table}', RESEED, ${reseedValue}) WITH NO_INFOMSGS`,
    transaction
  );
  return { table, nextId };
};

const assertValidAction = (action) => {
  if (!Object.values(MAINTENANCE_ACTIONS).includes(action)) {
    const error = new Error("Action must be either 'delete' or 'truncate'.");
    error.statusCode = 400;
    throw error;
  }
};

const assertConfirmation = (action, confirmation) => {
  if (String(confirmation || "").trim().toUpperCase() !== action.toUpperCase()) {
    const error = new Error(`Type ${action.toUpperCase()} to confirm this action.`);
    error.statusCode = 400;
    throw error;
  }
};

const deleteModuleRows = async (config, preservedIds, transaction) => {
  const deleted = [];
  for (const step of config.steps) {
    const rowCount = await countStepRows(step, preservedIds, transaction);
    await runStatement(
      `DELETE FROM ${qualify(step.table)}${buildStepWhere(step, preservedIds)}`,
      transaction
    );
    deleted.push({ table: step.table, rowCount });
  }
  return deleted;
};

const resetModuleIdentities = async (config, transaction) => {
  const results = [];
  for (const step of config.steps) {
    const result = await resetIdentity(step.table, transaction);
    if (result) results.push(result);
  }
  return results;
};

const runMaintenance = async ({ moduleKey, action, confirmation }, req) => {
  const config = getModuleConfig(moduleKey);
  assertValidAction(action);
  assertConfirmation(action, confirmation);
  const moduleLabel = getMaintenanceModuleLabel(moduleKey);

  const result = await sequelize.transaction(async (transaction) => {
    let operationOrder = [moduleKey];
    let summaries = null;

    if (action === MAINTENANCE_ACTIONS.TRUNCATE) {
      summaries = [];
      for (const key of Object.keys(MAINTENANCE_MODULES)) {
        summaries.push(await buildModuleSummary(key, transaction));
      }
      const plan = createTruncatePlan(moduleKey, summaries);
      if (plan.error) {
        const error = new Error(plan.error);
        error.statusCode = 409;
        throw error;
      }
      operationOrder = plan.order;
    } else {
      const preservedIds = await resolvePreservedIds(config, transaction);
      const blockers = await findBlockingReferences(config, preservedIds, transaction);
      if (blockers.length) {
        const error = new Error(describeBlockers(moduleLabel, blockers));
        error.statusCode = 409;
        error.details = blockers;
        throw error;
      }
    }

    const deletedRows = [];
    const identityReset = [];
    let preservedAdminCount = 0;
    for (const key of operationOrder) {
      const moduleConfig = MAINTENANCE_MODULES[key];
      const preservedIds = await resolvePreservedIds(moduleConfig, transaction);
      preservedAdminCount += preservedIds.length;
      const moduleDeletedRows = await deleteModuleRows(moduleConfig, preservedIds, transaction);
      deletedRows.push(
        ...moduleDeletedRows.map((row) => ({ ...row, module: key }))
      );

      if (action === MAINTENANCE_ACTIONS.TRUNCATE) {
        identityReset.push(...await resetModuleIdentities(moduleConfig, transaction));
      }
    }

    return {
      module: moduleKey,
      label: moduleLabel,
      action,
      dependentModules: operationOrder
        .filter((key) => key !== moduleKey)
        .map((key) => ({ key, label: getMaintenanceModuleLabel(key) })),
      deletedRows,
      totalDeleted: deletedRows.reduce((sum, t) => sum + t.rowCount, 0),
      identityReset,
      preservedAdminCount,
    };
  });

  await writeAuditLog({
    req,
    tableName: moduleLabel,
    recordId: null,
    actionType: MAINTENANCE_AUDIT_ACTIONS[action],
    newData: result,
  });

  return result;
};

module.exports = { getModuleSummaries, runMaintenance };
