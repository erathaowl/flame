# Upgrade, data migration and rollback

## Upgrade from v2.5.1 to the current master

The current `master` branch includes the migration from
`data/config.json` to a typed SQLite `settings` table. The published
`v2.5.1` release still uses the old storage scheme.

Before upgrading:

1. Stop Flame so the SQLite database is not being written.
2. Back up the **entire** persistent `/app/data` directory.
3. Record the currently deployed image tag.
4. Deploy the desired new image and inspect startup logs for successful
   migration completion.

At startup, migration `08_settings.js` imports the existing scalar
properties of `data/config.json` into `settings` and supplies missing
values from `utils/init/initialConfig.json`. The migrated settings have
`key`, `value` and `valueType` columns, with values typed as string,
number or boolean. Future edits write only to SQLite. The old JSON file
is retained as migration input and a recovery reference.

The earlier `01_new-config.js` migration remains in place to support
upgrades from older Flame databases.

## What persists where?

| Data | Storage |
| --- | --- |
| Applications, categories, bookmarks | SQLite |
| Quote library | SQLite |
| General/interface/weather settings | SQLite (`settings`) |
| Uploaded icons | `data/uploads` |
| Custom themes and search queries | Separate JSON files in `data` |
| Legacy configuration | `data/config.json` (read once by migration) |

The YAML import writes the sorting setting and application/bookmark records
within a single SQLite transaction. See [YAML backup](yaml-backup.md).

## Rollback to an older version

**Restore the matching pre-upgrade data backup together with the older image.**
Reusing a migrated database with an older version is not a supported
downgrade path, since older code expects `config.json` and older schema
versions. An automatic database rollback is not performed.

SQLite data and uploaded files are both important; a YAML export does not
replace a full volume backup. Check the existing `data/db_backups`
directory, but prefer a verified backup of the entire `data` volume.

## Migration verification

The CI suite exercises both a clean installation and migration from an
existing JSON configuration, checks type preservation and missing defaults,
and verifies rollback when a combined application/settings transaction
fails. See [testing](testing.md).
