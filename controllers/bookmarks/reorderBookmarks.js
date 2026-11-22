const Bookmark = require('../../models/Bookmark');
const { sequelize } = require('../../db');
const reorder = require('../reorder');

module.exports = reorder(Bookmark, 'bookmarks', sequelize);
