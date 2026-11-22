const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('SQLite imports existing settings and rolls back combined data changes', async () => {
  const previousDirectory = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'flame-settings-'));
  let sequelize;

  try {
    await fs.mkdir(path.join(directory, 'data'));
    const configFile = path.join(directory, 'data/config.json');
    const legacy = {
      customTitle: 'Existing dashboard',
      hideHeader: true,
      lat: 45.42,
      useOrdering: 'createdAt',
    };
    await fs.writeFile(configFile, JSON.stringify(legacy));

    process.chdir(directory);
    ({ sequelize } = require('../../db'));
    const migration = require('../../db/migrations/08_settings');
    await sequelize.authenticate();
    await migration.up(sequelize.getQueryInterface());

    const loadConfig = require('../../utils/loadConfig');
    const saveConfig = require('../../utils/saveConfig');
    const App = require('../../models/App');
    await App.sync({ force: true });

    const imported = await loadConfig();
    assert.equal(imported.customTitle, 'Existing dashboard');
    assert.equal(imported.hideHeader, true);
    assert.equal(imported.lat, 45.42);
    assert.equal(imported.useOrdering, 'createdAt');
    assert.equal(typeof imported.hideHeader, 'boolean');
    assert.equal(typeof imported.lat, 'number');

    await saveConfig({ largeClock: true, lat: 44.5 });
    assert.equal((await loadConfig()).largeClock, true);
    assert.equal((await loadConfig()).lat, 44.5);

    await fs.writeFile(configFile, JSON.stringify({ hideHeader: false }));
    assert.equal((await loadConfig()).hideHeader, true);

    await App.create({ name: 'Original', url: 'https://original.example.com' });

    await assert.rejects(
      sequelize.transaction(async (transaction) => {
        await App.destroy({ where: {}, transaction });
        await App.create({
          name: 'Imported',
          url: 'https://imported.example.com',
        }, { transaction });
        await saveConfig({ useOrdering: 'orderId' }, transaction);
        throw new Error('Simulated import failure');
      }),
      /Simulated import failure/
    );

    assert.equal((await loadConfig()).useOrdering, 'createdAt');
    const apps = await App.findAll();
    assert.equal(apps.length, 1);
    assert.equal(apps[0].name, 'Original');

    await sequelize.transaction(async (transaction) => {
      await App.destroy({ where: {}, transaction });
      await App.create({
        name: 'Imported',
        url: 'https://imported.example.com',
      }, { transaction });
      await saveConfig({ useOrdering: 'orderId' }, transaction);
    });

    assert.equal((await loadConfig()).useOrdering, 'orderId');
    assert.equal((await App.findOne()).name, 'Imported');
  } finally {
    if (sequelize) await sequelize.close();
    process.chdir(previousDirectory);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
