const asyncWrapper = require('../../middleware/asyncWrapper');
const Bookmark = require('../../models/Bookmark');
const Category = require('../../models/Category');
const { Sequelize } = require('sequelize');
const loadConfig = require('../../utils/loadConfig');

// @desc      Get all bookmarks
// @route     GET /api/bookmarks
// @access    Public
const getAllBookmarks = asyncWrapper(async (req, res, next) => {
  const { useOrdering: orderType } = await loadConfig();

  // bookmarks visibility
  const where = req.isAuthenticated ? {} : { isPublic: true };

  const order =
    orderType == 'name'
      ? [[Sequelize.fn('lower', Sequelize.col('Bookmark.name')), 'ASC']]
      : [[orderType, 'ASC']];

  const bookmarks = await Bookmark.findAll({
    order,
    where,
    include: req.isAuthenticated ? [] : [{
      model: Category,
      attributes: [],
      required: true,
      where: { isPublic: true },
    }],
  });

  res.status(200).json({
    success: true,
    data: bookmarks,
  });
});

module.exports = getAllBookmarks;
