const Category = require('../../models/Category');
const { sequelize } = require('../../db');
const reorder = require('../reorder');

module.exports = reorder(Category, 'categories', sequelize);
