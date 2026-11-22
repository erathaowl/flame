const asyncWrapper = require('../../middleware/asyncWrapper');
const Bookmark = require('../../models/Bookmark');

// @desc      Create new bookmark
// @route     POST /api/bookmarks
// @access    Public
const createBookmark = asyncWrapper(async (req, res, next) => {
  let bookmark;

  let body = {
    ...req.body,
    categoryId: parseInt(req.body.categoryId),
  };

  if (body.icon) {
    body.icon = body.icon.trim();
  }

  if (req.file) {
    body.icon = req.file.filename;
  }

  const lastOrder = await Bookmark.max('orderId', {
    where: { categoryId: body.categoryId },
  });
  bookmark = await Bookmark.create({
    ...body,
    orderId: (lastOrder || 0) + 1,
  });

  res.status(201).json({
    success: true,
    data: bookmark,
  });
});

module.exports = createBookmark;
