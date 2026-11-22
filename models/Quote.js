const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Quote = sequelize.define('Quote', {
  text: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'quotes' });

module.exports = Quote;
