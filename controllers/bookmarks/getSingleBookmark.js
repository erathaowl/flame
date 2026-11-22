const asyncWrapper = require('../../middleware/asyncWrapper');
const ErrorResponse = require('../../utils/ErrorResponse');
const Bookmark = require('../../models/Bookmark');
const Category = require('../../models/Category');

// @desc      Get single bookmark
// @route     GET /api/bookmarks/:id
// @access    Public
const getSingleBookmark = asyncWrapper(async (req, res, next) => {
  const visibility = req.isAuthenticated ? {} : { isPublic: true };

  const bookmark = await Bookmark.findOne({
    where: { id: req.params.id, ...visibility },
    include: req.isAuthenticated ? [] : [{
      model: Category,
      attributes: [],
      required: true,
      where: { isPublic: true },
    }],
  });

  if (!bookmark) {
    return next(
      new ErrorResponse(
        `Bookmark with the id of ${req.params.id} was not found`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: bookmark,
  });
});

module.exports = getSingleBookmark;
