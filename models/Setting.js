const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Setting = sequelize.define('Setting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT, allowNull: false },
  valueType: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'settings', timestamps: false });

module.exports = Setting;
