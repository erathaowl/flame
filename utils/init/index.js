const initFiles = require('./initFiles');
const initDockerSecrets = require('./initDockerSecrets');
const initSecret = require('./initSecret');

const initApp = async () => {
  initDockerSecrets();
  initSecret();
  await initFiles();
};

module.exports = initApp;
