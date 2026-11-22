const { DataTypes } = require('sequelize');

const up = async (query) => {
  await query.createTable('quotes', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    text: { type: DataTypes.TEXT, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });
};

const down = async (query) => {
  await query.dropTable('quotes');
};

module.exports = { up, down };
