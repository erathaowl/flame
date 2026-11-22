const asyncWrapper = require('../../middleware/asyncWrapper');
const App = require('../../models/App');
const { Sequelize } = require('sequelize');
const loadConfig = require('../../utils/loadConfig');

const { useKubernetes, useDocker } = require('./docker');

// @desc      Get all apps
// @route     GET /api/apps
// @access    Public
const getAllApps = asyncWrapper(async (req, res, next) => {
  const config = await loadConfig();
  const {
    useOrdering: orderType,
    dockerApps: useDockerAPI,
    kubernetesApps: useKubernetesAPI,
  } = config;

  if (useDockerAPI) await useDocker(config);
  if (useKubernetesAPI) await useKubernetes(config);

  // apps visibility
  const where = req.isAuthenticated ? {} : { isPublic: true };

  const order =
    orderType == 'name'
      ? [[Sequelize.fn('lower', Sequelize.col('name')), 'ASC']]
      : [[orderType, 'ASC']];

  const apps = await App.findAll({
    order,
    where,
  });

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cache-Control', 'no-store');
  }

  res.status(200).json({
    success: true,
    data: apps,
  });
});

module.exports = getAllApps;
