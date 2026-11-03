const { Op, literal } = require("sequelize");
const { AuditLog } = require("../models");
const logger = require("../utils/logger");
const { normalizeDateForDb } = require("../utils/dateFormatter");
const { buildCreatedRemark, buildUpdatedRemark } = require("../utils/systemRemarks");
const { SYSTEM_REMARKS_FIELD } = require("../constants/remarks");

// Fails fast with a clear, actionable message instead of letting every
// crud.service function crash later with a bare "Cannot read properties
// of undefined (reading 'create')" (or 'update'/'findAll'/etc.) whenever a
// module's registry entry is missing or malformed - that error gave no
// clue which module or which registry field was the problem.
const assertValidModuleConfig = (config) => {
  if (!config) {
    throw new Error(
      "No module configuration was found for this route. Check that the module is registered in the relevant routes registry (e.g. server/routes/masterRoutes.js)."
    );
  }
  if (!config.model) {
    throw new Error(
      `Module configuration for "${config.tableName || "unknown module"}" is missing its Sequelize "model" - check the registry entry in server/routes/masterRoutes.js.`
    );
  }
};

const buildWhere = (search, searchFields = []) => {
  if (!search || !searchFields.length) {
    return {};
  }

  return {
    [Op.or]: searchFields.map((field) => ({
      [field]: {
        [Op.like]: `%${search}%`,
      },
    })),
  };
};

// Combines the generic text-search where clause with an optional
// module-specific structured filter (e.g. invoices' date/vendor/plant/status
// filters). Modules that don't define buildExtraWhere behave exactly as
// before this was added.
// Reflect.ownKeys is used because Sequelize operators (Op.and, Op.or) are
// Symbol keys, which Object.keys skips - that silently dropped every
// search, filter and access clause built only from operators.
const hasConditions = (where) => Boolean(where) && Reflect.ownKeys(where).length > 0;

const mergeWhere = (...whereClauses) => {
  const clauses = whereClauses.filter(hasConditions);
  if (clauses.length > 1) {
    return { [Op.and]: clauses };
  }
  return clauses[0] || {};
};

const getAttributeTypeKey = (attribute) => {
  if (!attribute?.type) return "";
  if (typeof attribute.type.key === "string") return attribute.type.key;
  if (typeof attribute.type.toString === "function") {
    return attribute.type.toString().toUpperCase();
  }
  return "";
};

const sanitizeModelPayload = (model, data = {}) => {
  const sanitized = { ...data };

  Object.entries(model.rawAttributes || {}).forEach(([fieldName, attribute]) => {
    if (!(fieldName in sanitized)) return;

    const value = sanitized[fieldName];
    const typeKey = getAttributeTypeKey(attribute);

    if (value === "") {
      sanitized[fieldName] = null;
      return;
    }

    if (typeKey === "DATEONLY") {
      sanitized[fieldName] = normalizeDateForDb(value);
      return;
    }

    if (typeKey === "DATE") {
      const normalized = normalizeDateForDb(value);
      if (!normalized) {
        sanitized[fieldName] = null;
        return;
      }

      const parsedDate = new Date(normalized);
      sanitized[fieldName] = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
  });

  return sanitized;
};

// Modules flagged with systemRemarks own their Remarks column: whatever
// the request sent is replaced with the generated text.
const withSystemRemark = (config, data, buildRemark) =>
  config.systemRemarks ? { ...data, [SYSTEM_REMARKS_FIELD]: buildRemark() } : data;

const getAll = async (config, query = {}, user) => {
  assertValidModuleConfig(config);
  const {
    page = 1,
    pageSize = 10,
    search = "",
    sortField = config.primaryKey,
    sortOrder = "DESC",
  } = query;

  const offset = (Number(page) - 1) * Number(pageSize);
  const allowedSortFields = config.sortFields || [config.primaryKey];
  const selectedSortField = allowedSortFields.includes(sortField)
    ? sortField
    : config.primaryKey;
  const selectedSortOrder =
    String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const searchWhere = buildWhere(search, config.searchFields);
  const extraWhere = config.buildExtraWhere ? config.buildExtraWhere(query) : {};
  const accessWhere = config.buildAccessWhere ? await config.buildAccessWhere(user) : null;

  const { count, rows } = await config.model.findAndCountAll({
    where: mergeWhere(searchWhere, extraWhere, accessWhere),
    include: config.include || [],
    order: [[selectedSortField, selectedSortOrder]],
    offset,
    limit: Number(pageSize),
    distinct: true,
  });

  return {
    totalRecords: count,
    page: Number(page),
    pageSize: Number(pageSize),
    data: rows,
  };
};

const getById = async (config, id, user) => {
  assertValidModuleConfig(config);
  const accessWhere = config.buildAccessWhere ? await config.buildAccessWhere(user) : null;
  return await config.model.findOne({
    where: mergeWhere({ [config.primaryKey]: id }, accessWhere),
    include: config.include || [],
  });
};

const findAccessibleRecord = async (config, id, user) => {
  const accessWhere = config.buildAccessWhere ? await config.buildAccessWhere(user) : null;
  return config.model.findOne({
    where: mergeWhere({ [config.primaryKey]: id }, accessWhere),
  });
};

const writeAuditLog = async ({
  req,
  tableName,
  recordId,
  actionType,
  oldData = null,
  newData = null,
}) => {
  try {
    await AuditLog.create({
      UserID: req.user?.UserID || null,
      TableName: tableName,
      RecordID: Number(recordId) || null,
      ActionType: actionType,
      OldData: oldData ? JSON.stringify(oldData) : null,
      NewData: newData ? JSON.stringify(newData) : null,
      IPAddress: req.ip,
      // Passed explicitly as a real JS Date rather than relying on a model
      // defaultValue: DataTypes.NOW, which Sequelize's mssql dialect can
      // serialize as the literal text "NOW" and which SQL Server then fails
      // to CONVERT into a datetime.
      ActionDate: literal("GETDATE()"),
    });
  } catch (error) {
    logger.error("Audit log write failed; keeping the main write successful.", {
      tableName,
      recordId,
      actionType,
      message: error.message,
    });
  }
};

const reloadRecord = async (config, recordId) => {
  try {
    return await config.model.findByPk(recordId, {
      include: config.include || [],
    });
  } catch (error) {
    logger.error("Failed to reload record after write; returning the saved payload instead.", {
      tableName: config.tableName,
      recordId,
      message: error.message,
    });
    return null;
  }
};

const create = async (config, data, req) => {
  assertValidModuleConfig(config);

  // Some models (e.g. CustomerMaster) track a CreatedAt column but - like
  // AuditLog.ActionDate above - must never rely on a model-level
  // defaultValue: DataTypes.NOW for it, so it's stamped here explicitly
  // with a real JS Date whenever the model defines the column and the
  // caller didn't already supply one.
  const createData = withSystemRemark(config, sanitizeModelPayload(config.model, data), () => buildCreatedRemark(req.user));
  if (config.model.rawAttributes.CreatedAt && (createData.CreatedAt === undefined || createData.CreatedAt === null)) {
    createData.CreatedAt = literal("GETDATE()");
  }

  const record = await config.model.create(createData);

  await writeAuditLog({
    req,
    tableName: config.tableName,
    recordId: record[config.primaryKey],
    actionType: "CREATE",
    newData: record,
  });

  return (await reloadRecord(config, record[config.primaryKey])) || record;
};

const update = async (config, id, data, req) => {
  assertValidModuleConfig(config);
  const record = await findAccessibleRecord(config, id, req.user);

  if (!record) {
    return null;
  }

  const oldData = record.toJSON();
  const updateData = withSystemRemark(
    config,
    sanitizeModelPayload(config.model, data),
    () => buildUpdatedRemark(oldData[SYSTEM_REMARKS_FIELD], req.user)
  );
  await record.update(updateData);

  await writeAuditLog({
    req,
    tableName: config.tableName,
    recordId: id,
    actionType: "UPDATE",
    oldData,
    newData: record,
  });

  return (await reloadRecord(config, id)) || record;
};

const remove = async (config, id, req) => {
  assertValidModuleConfig(config);
  const record = await findAccessibleRecord(config, id, req.user);

  if (!record) {
    return null;
  }

  // Soft-delete modules (masters referenced by historical records) flip
  // their active flag instead of being destroyed, so a deactivated vendor,
  // vehicle type, etc. never breaks a past contract/invoice that still
  // points at it (task item 4/7: "activate/deactivate user (soft toggle,
  // not delete)" - applied to every soft-delete-flagged master, not just
  // users).
  if (config.softDeleteField) {
    const oldData = record.toJSON();
    await record.update({ [config.softDeleteField]: false });

    await writeAuditLog({
      req,
      tableName: config.tableName,
      recordId: id,
      actionType: "DEACTIVATE",
      oldData,
      newData: record,
    });

    return record;
  }

  await record.destroy();

  await writeAuditLog({
    req,
    tableName: config.tableName,
    recordId: id,
    actionType: "DELETE",
    oldData: record,
  });

  return record;
};

// Permanent delete for modules that opt in via allowHardDelete (Admin
// only, enforced at the route). Unlike remove(), this ignores
// softDeleteField and destroys the row; a foreign key error from records
// that still reference it is left for the controller to report.
const hardRemove = async (config, id, req) => {
  assertValidModuleConfig(config);
  const record = await findAccessibleRecord(config, id, req.user);

  if (!record) {
    return null;
  }

  const oldData = record.toJSON();
  await record.destroy();

  await writeAuditLog({
    req,
    tableName: config.tableName,
    recordId: id,
    actionType: "HARD_DELETE",
    oldData,
  });

  return record;
};

// Generic bulk-create for any module whose registry entry defines
// `bulkUploadFields` (task item 11: bulk Excel upload for every master
// except Contract Master and Add Invoice). Rows come pre-parsed from the
// uploaded spreadsheet (see masterRoutes.js) as plain objects keyed by
// column header; only the configured fields are read from each row so
// stray/extra spreadsheet columns are ignored rather than crashing the
// insert. Each row is validated and inserted independently so one bad row
// doesn't block the rest, and every failure is reported back with its
// original row number for the uploader to fix and resubmit.
const bulkUpload = async (config, rows, req) => {
  assertValidModuleConfig(config);
  if (!config.bulkUploadFields) {
    throw new Error(
      `Bulk upload is not enabled for "${config.tableName}" - add a bulkUploadFields array to its registry entry to enable it.`
    );
  }
  const results = { successCount: 0, errorCount: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const data = {};
    config.bulkUploadFields.forEach((field) => {
      if (row[field] !== undefined) data[field] = row[field];
    });
    const sanitizedData = withSystemRemark(
      config,
      sanitizeModelPayload(config.model, data),
      () => buildCreatedRemark(req.user, "Bulk upload")
    );
    if (config.model.rawAttributes.CreatedAt && (sanitizedData.CreatedAt === undefined || sanitizedData.CreatedAt === null)) {
      sanitizedData.CreatedAt = literal("GETDATE()");
    }

    try {
      const record = await config.model.create(sanitizedData);
      await writeAuditLog({
        req,
        tableName: config.tableName,
        recordId: record[config.primaryKey],
        actionType: "CREATE",
        newData: record,
      });
      results.successCount += 1;
    } catch (error) {
      results.errorCount += 1;
      results.errors.push({ row: i + 2, message: error.message }); // +2: header row + 1-index
    }
  }

  return results;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  hardRemove,
  bulkUpload,
  writeAuditLog,
};
