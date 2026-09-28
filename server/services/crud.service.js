const { Op } = require("sequelize");
const { AuditLog } = require("../models");


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

const getAll = async (config, query = {}) => {

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

  const { count, rows } = await config.model.findAndCountAll({
    where: buildWhere(search, config.searchFields),

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

const getById = async (config, id) => {

  return await config.model.findByPk(id, {
    include: config.include || [],
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
  await AuditLog.create({
    UserID: req.user?.UserID || null,
    TableName: tableName,
    RecordID: Number(recordId) || null,
    ActionType: actionType,
    OldData: oldData ? JSON.stringify(oldData) : null,
    NewData: newData ? JSON.stringify(newData) : null,
    IPAddress: req.ip,
  });
};

const create = async (config, data, req) => {
  const record = await config.model.create(data);


  await writeAuditLog({
    req,
    tableName: config.tableName,
    recordId: record[config.primaryKey],
    actionType: "CREATE",
    newData: record,
  });

  return await getById(config, record[config.primaryKey]);
};

const update = async (config, id, data, req) => {

  const record = await config.model.findByPk(id);

  if (!record) {
    return null;
  }

  const oldData = record.toJSON();
  await record.update(data);


  await writeAuditLog({
    req,
    tableName: config.tableName,
    recordId: id,
    actionType: "UPDATE",
    oldData,
    newData: record,
  });

  return await getById(config, id);
};

const remove = async (config, id, req) => {

  const record = await config.model.findByPk(id);

  if (!record) {
    return null;
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


module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,

};
