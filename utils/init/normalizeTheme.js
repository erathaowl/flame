const loadConfig = require('../loadConfig');
const saveConfig = require('../saveConfig');
const { themes } = require('./themes.json');

const normalizeTheme = async () => {
  const { defaultTheme } = await loadConfig();
  const theme = themes.find((item) => item.name === defaultTheme);
  if (!theme) return;

  const { primary, accent, background } = theme.colors;
  await saveConfig({ defaultTheme: `${primary};${accent};${background}` });
};

module.exports = normalizeTheme;
