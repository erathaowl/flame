const asyncWrapper = require('../../middleware/asyncWrapper');
const loadConfig = require('../../utils/loadConfig');
const saveConfig = require('../../utils/saveConfig');

const updateConfig = asyncWrapper(async (req, res) => {
  await saveConfig(req.body);

  res.status(200).json({
    success: true,
    data: await loadConfig(),
  });
});

module.exports = updateConfig;
