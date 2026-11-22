const express = require('express');
const { auth, requireAuth, asyncWrapper } = require('../middleware');
const { sequelize } = require('../db');
const App = require('../models/App');
const Category = require('../models/Category');
const Bookmark = require('../models/Bookmark');
const loadConfig = require('../utils/loadConfig');
const saveConfig = require('../utils/saveConfig');
const { parseBackup, exportBackup } = require('../utils/backupData');

const router = express.Router();
router.use(auth, requireAuth);

router.get('/', asyncWrapper(async (req, res) => {
  const config = await loadConfig();
  const sortField = config.useOrdering === 'createdAt' ? 'createdAt' : 'orderId';
  const order = [[sortField, 'ASC'], ['id', 'ASC']];
  const [applications, categories] = await Promise.all([
    App.findAll({ order }),
    Category.findAll({
      include: [{ model: Bookmark, as: 'bookmarks' }],
      order,
    }),
  ]);

  const document = exportBackup({
    applications,
    categories: categories.map((category) => ({
      ...category.get({ plain: true }),
      bookmarks: category.bookmarks.slice().sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1;
        if (a[sortField] > b[sortField]) return 1;
        return a.id - b.id;
      }),
    })),
    sorting: config.useOrdering,
  });

  res.setHeader('Content-Type', 'application/x-yaml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="flame-backup.yaml"');
  res.setHeader('Cache-Control', 'no-store');
  res.send(document);
}));

router.post('/', express.text({
  type: ['application/x-yaml', 'text/yaml', 'text/plain'],
  limit: '2mb',
}), asyncWrapper(async (req, res) => {
  let data;
  try {
    data = parseBackup(req.body);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  await sequelize.transaction(async (transaction) => {
    await Bookmark.destroy({ where: {}, transaction });
    await Category.destroy({ where: {}, transaction });
    await App.destroy({ where: {}, transaction });

    await App.bulkCreate(data.applications, { transaction });

    for (const category of data.categories) {
      const { bookmarks, ...attributes } = category;
      const created = await Category.create(attributes, { transaction });
      await Bookmark.bulkCreate(
        bookmarks.map((bookmark) => ({ ...bookmark, categoryId: created.id })),
        { transaction }
      );
    }

    await saveConfig({ useOrdering: data.sorting }, transaction);
  });

  return res.json({
    success: true,
    data: {
      applications: data.applications.length,
      categories: data.categories.length,
      bookmarks: data.categories.reduce((count, category) => count + category.bookmarks.length, 0),
    },
  });
}));

module.exports = router;
