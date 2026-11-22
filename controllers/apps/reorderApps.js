const asyncWrapper = require('../../middleware/asyncWrapper');
const App = require('../../models/App');
const { sequelize } = require('../../db');

const reorderApps = asyncWrapper(async (req, res) => {
  const items = req.body.apps;
  const valid =
    Array.isArray(items) &&
    items.every((item, index) =>
      item &&
      Number.isInteger(item.id) &&
      item.id > 0 &&
      item.orderId === index + 1
    ) &&
    new Set(items.map((item) => item.id)).size === items.length;

  if (!valid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid reorder payload',
    });
  }

  await sequelize.transaction(async (transaction) => {
    for (const { id, orderId } of items) {
      await App.update({ orderId }, { where: { id }, transaction });
    }
  });

  return res.status(200).json({
    success: true,
    data: {},
  });
});

module.exports = reorderApps;
