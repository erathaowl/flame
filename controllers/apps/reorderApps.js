const App = require('../../models/App');
const { sequelize } = require('../../db');
const reorder = require('../reorder');

module.exports = reorder(App, 'apps', sequelize);
