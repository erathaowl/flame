const { readFile } = require('fs/promises');
const defaults = require('../../utils/init/initialConfig.json');

const up = async (query) => {
  let previous = {};
  try {
    previous = JSON.parse(await readFile('data/config.json', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (!previous || typeof previous !== 'object' || Array.isArray(previous)) {
    throw new Error('Invalid legacy configuration');
  }

  const rows = Object.entries({ ...defaults, ...previous }).map(([key, value]) => {
    const valueType = typeof value;
    if (!['string', 'number', 'boolean'].includes(valueType) ||
        (valueType === 'number' && !Number.isFinite(value))) {
      throw new Error(`Invalid configuration value for ${key}`);
    }
    return { key, value: String(value), valueType };
  });

  await query.sequelize.transaction(async (transaction) => {
    await query.sequelize.query(
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        valueType TEXT NOT NULL CHECK (valueType IN ('string', 'number', 'boolean'))
      )`,
      { transaction }
    );
    await query.bulkInsert('settings', rows, { transaction });
  });
};

const down = async (query) => {
  await query.dropTable('settings');
};

module.exports = { up, down };
