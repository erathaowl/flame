const { DataTypes } = require('sequelize');

const up = async (query) => {
  await query.addColumn('apps', 'statusEndpoint', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  });
};

const down = async (query) => {
  await query.removeColumn('apps', 'statusEndpoint');
};

module.exports = { up, down };
