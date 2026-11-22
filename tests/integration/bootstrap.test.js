const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('fresh installation applies all migrations and initializes typed settings', async () => {
  const previousDirectory = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'flame-boot-'));
  let sequelize;

  try {
    await fs.mkdir(path.join(directory, 'data'));
    const configDirectory = path.join(directory, 'utils/init');
    await fs.mkdir(configDirectory, { recursive: true });
    await fs.copyFile(
      path.join(__dirname, '../../utils/init/initialConfig.json'),
      path.join(configDirectory, 'initialConfig.json')
    );

    process.chdir(directory);
    process.env.VERSION = '2.5.1';
    const db = require('../../db');
    sequelize = db.sequelize;
    await db.connectDB();

    const loadConfig = require('../../utils/loadConfig');
    const normalizeTheme = require('../../utils/init/normalizeTheme');
    const before = await loadConfig();
    assert.equal(before.useOrdering, 'createdAt');
    assert.equal(before.defaultTheme, 'tron');
    assert.equal(before.hideHeader, false);

    await normalizeTheme();
    const after = await loadConfig();
    assert.match(after.defaultTheme, /^#[0-9a-fA-F]+;#[0-9a-fA-F]+;#[0-9a-fA-F]+$/);

    const [settings] = await sequelize.query(
      "SELECT key, valueType FROM settings WHERE key IN ('hideHeader', 'lat') ORDER BY key"
    );
    assert.deepEqual(
      settings.map((row) => [row.key, row.valueType]),
      [['hideHeader', 'boolean'], ['lat', 'number']]
    );
  } finally {
    if (sequelize) await sequelize.close();
    process.chdir(previousDirectory);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
