const asyncWrapper = require('../../middleware/asyncWrapper');
const Category = require('../../models/Category');
const Bookmark = require('../../models/Bookmark');
const { Sequelize } = require('sequelize');
const loadConfig = require('../../utils/loadConfig');

// @desc      Get all categories
// @route     GET /api/categories
// @access    Public
const getAllCategories = asyncWrapper(async (req, res, next) => {
  const { useOrdering: orderType } = await loadConfig();

  // categories visibility
  const where = req.isAuthenticated ? {} : { isPublic: true };

  const order =
    orderType == 'name'
      ? [
          [Sequelize.fn('lower', Sequelize.col('Category.name')), 'ASC'],
          [Sequelize.fn('lower', Sequelize.col('bookmarks.name')), 'ASC'],
        ]
      : [
          [orderType, 'ASC'],
          [{ model: Bookmark, as: 'bookmarks' }, orderType, 'ASC'],
        ];

  const categories = await Category.findAll({
    include: [
      {
        model: Bookmark,
        as: 'bookmarks',
      },
    ],
    order,
    where,
  });

  const output = req.isAuthenticated
    ? categories
    : categories.map((category) => {
        const data = category.get({ plain: true });
        return {
          ...data,
          bookmarks: data.bookmarks.filter((bookmark) => bookmark.isPublic),
        };
      });

  res.status(200).json({
    success: true,
    data: output,
  });
});

module.exports = getAllCategories;
