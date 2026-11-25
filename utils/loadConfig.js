const Setting = require('../models/Setting');
const defaults = require('./init/initialConfig.json');

const loadConfig = async (transaction) => {
  const settings = await Setting.findAll({ raw: true, transaction });
  const config = { ...defaults };

  for (const { key, value, valueType } of settings) {
    if (['quoteEndpointSecret', 'quoteEndpointHeaders'].includes(key)) continue;
    if (valueType === 'boolean') config[key] = value === 'true';
    else if (valueType === 'number') config[key] = Number(value);
    else config[key] = value;
  }

  return config;
};

module.exports = loadConfig;
