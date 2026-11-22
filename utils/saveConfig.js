const { sequelize } = require('../db');
const Setting = require('../models/Setting');
const defaults = require('./init/initialConfig.json');
const ErrorResponse = require('./ErrorResponse');

const saveConfig = async (changes, transaction) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new ErrorResponse('Invalid configuration', 400);
  }

  const rows = Object.entries(changes).map(([key, value]) => {
    const valueType = typeof value;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ||
        !['string', 'number', 'boolean'].includes(valueType) ||
        (valueType === 'number' && !Number.isFinite(value)) ||
        (Object.hasOwn(defaults, key) && typeof defaults[key] !== valueType)) {
      throw new ErrorResponse(`Invalid configuration value for ${key}`, 400);
    }
    return { key, value: String(value), valueType };
  });

  const write = async (tx) => {
    for (const row of rows) {
      await Setting.upsert(row, { transaction: tx });
    }
  };

  return transaction ? write(transaction) : sequelize.transaction(write);
};

module.exports = saveConfig;
