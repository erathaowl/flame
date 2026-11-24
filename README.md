# Flame

![Homescreen screenshot](.github/home.png)

## Description

Flame is a self-hosted start page for your server. Its design is inspired (heavily) by [SUI](https://github.com/jeroenpardon/sui). Flame is very easy to setup and use. With built-in editors, it allows you to setup your very own application hub in no time - no file editing necessary.

## Functionality
- 📝 Create, update, delete your applications and bookmarks directly from the app using built-in GUI editors
- 📌 Pin your favourite items to the homescreen for quick and easy access
- 🔍 Integrated search bar with local filtering, 11 web search providers and ability to add your own
- 🔑 Authentication system to protect your settings, apps and bookmarks
- 🔨 Dozens of options to customize Flame interface to your needs, including support for custom CSS, 15 built-in color themes and custom theme builder
- ☀️ Weather widget with current temperature, cloud coverage and animated weather status
- 🐳 Docker integration to automatically pick and add apps based on their labels

## Fork Docker images and releases

This fork publishes multi-platform Docker images to GitHub Container Registry for
`linux/amd64` and `linux/arm64`.

```sh
docker pull ghcr.io/erathaowl/flame:latest
docker run -d --name flame -p 5005:5005 \
  -v /path/to/data:/app/data \
  -e PASSWORD=change_me \
  ghcr.io/erathaowl/flame:latest
```

### Automated Docker builds

The [Docker Build workflow](.github/workflows/docker.yml) publishes an image on
every branch push, except a `master` push that changes
`.github/release-request.txt`. In that case, the Release workflow alone
builds and publishes the versioned image and `latest`.
The `master` branch otherwise publishes `latest`; other branches use
a lowercase, Docker-safe version of their branch name (for example,
`feature/login` becomes `feature-login`). In **Actions > Docker Build > Run workflow**,
you can provide `custom_tag` to override the automatic tag. Without an override,
the branch rules apply. Manual Docker builds remain available during release pushes.

### Releases

Push a version tag to start the [Release workflow](.github/workflows/release.yml).
Both `vX.Y.Z` and `vX.Y` are accepted. A short tag such as `v2.6` creates a
`v2.6.0` GitHub Release and publishes the `v2.6.0` and `latest` Docker tags.
The workflow also accepts a release request committed to
`.github/release-request.txt` on `master`. The first line specifies the
release version, and the workflow creates the normalized Git tag.

```sh
git tag v2.7.0
git push origin v2.7.0
docker pull ghcr.io/erathaowl/flame:v2.7.0
```

Release notes are generated from GitHub history. Existing releases are never
overwritten. Build and release workflows use the repository's `GITHUB_TOKEN`
with the required package or release permissions.

## Application status via Gatus

Configure each application's own endpoint URL in the application editor,
for example `https://status.example.com/api/v1/endpoints/core_backend/statuses`.
Flame displays green, yellow or red according to recent Gatus checks.
See [status monitoring reference](docs/status-monitoring.md) for the
required JSON format, caching, availability and security considerations.

## YAML backup and restore

Use **Settings > Backup** to export or replace applications, categories and
bookmarks in YAML, preserving order, visibility, pinning and status URLs.
The import is transactional in SQLite. Uploaded icon binaries, quotes and
other settings are outside the YAML backup.

See [backup schema and examples](docs/yaml-backup.md).

## Header clock and quote sources

Open **Settings > Clock** to choose the header layout, clock font, size,
style and individual colors for hours, minutes, seconds and both separators.
Theme-based colors (including dimmed variants) follow the active theme;
custom HEX colors remain fixed. All elements default to the primary color.
See [clock font setup](docs/clock-fonts.md).

Open **Settings > Quotes** to select the default local quote library or a
JSON endpoint. The local library is preserved when switching sources and
serves as a fallback if the endpoint fails. Configure the endpoint URL,
optional Bearer or query-string authentication, and JSONPath expressions
for the quote and author. Test the configuration before saving. Authors
are appended in parentheses when present. An empty library falls back to
the existing time-of-day greetings.

See [quote sources and clock colors](docs/quotes-and-clock.md).

## SQLite settings storage

Starting with v2.6.0, Flame stores settings
in the SQLite `settings` table. Each setting is a row with a `key`, text
`value`, and `valueType` (`string`, `number`, or `boolean`). Applications,
bookmarks, categories and quotes remain in their existing tables.

On first startup after upgrading, the database migration copies all scalar
settings from `data/config.json` into SQLite, using `initialConfig.json`
for missing defaults. Existing values, including custom options, are
preserved. `data/config.json` remains untouched as a migration backup;
changes made to it afterward have no effect. Current settings are read and
updated through SQLite only.

The YAML restore operation now updates the sorting setting in the *same*
SQLite transaction as applications, categories, and bookmarks. An import
failure rolls back all those changes. Other settings and uploaded icon
files are outside the scope of the YAML export.

Flame also takes its existing database backup before applying migrations
(`data/db_backups`). Keep a full copy of the `/app/data` volume before
upgrading. When downgrading to a file-based release, restore the matching
pre-migration database and configuration backup together.

## Installation

### Docker / GHCR (recommended)

Use the fork's published multi-platform images for `linux/amd64` or
`linux/arm64`. Select a version tag for predictable updates, or use
`latest` to follow the current `master` build.

```sh
docker pull ghcr.io/erathaowl/flame:v2.7.0

docker run -d --name flame -p 5005:5005 \
  -v /path/to/data:/app/data \
  -e PASSWORD=change_me \
  --restart unless-stopped \
  ghcr.io/erathaowl/flame:v2.7.0
```

Use a strong password, protect access to port 5005, and keep the persistent
`/app/data` directory backed up. Release `v2.6.0` introduces the SQLite
settings migration; review [upgrade guidance](docs/upgrade.md) and back up
the entire data volume before upgrading from `v2.5.1` or earlier.

A sample [Docker Compose configuration](.docker/docker-compose.yml) is
included. To enable automatic Docker app discovery, explicitly mount
`/var/run/docker.sock` (grants powerful access to the host) and enable
Docker integration in settings. Prefer the local socket or a properly
secured remote Docker endpoint; avoid exposing the Docker Engine over
unencrypted TCP.

#### Build locally

```sh
docker build -t flame -f .docker/Dockerfile .
docker buildx build --platform linux/amd64,linux/arm64 \
  -f .docker/Dockerfile.multiarch -t flame:multiarch .
```

#### Docker secrets

A Docker secret may be supplied with `PASSWORD_FILE`. In that case, keep
the password outside the image and refer to the mounted secret file.

```yaml
services:
  flame:
    image: ghcr.io/erathaowl/flame:v2.7.0
    ports:
      - "5005:5005"
    volumes:
      - /path/to/data:/app/data
    secrets:
      - flame_password
    environment:
      PASSWORD_FILE: /run/secrets/flame_password

secrets:
  flame_password:
    file: /path/to/secrets/flame_password
```

### Without Docker

Use the [upstream installation guide](https://github.com/pawelmalak/flame/wiki/Installation-without-docker)
as background, then configure this fork's persistent `data` directory,
`PASSWORD`, and `SECRET` as described in [upgrade guidance](docs/upgrade.md).

## Development

### Technology

- Backend
  - Node.js + Express
  - Sequelize ORM + SQLite
- Frontend
  - React
  - Redux
  - TypeScript
- Deployment
  - Docker
  - Kubernetes

### Creating dev environment

```sh
# clone repository
git clone https://github.com/erathaowl/flame
cd flame

# run only once
npm run dev-init

# start backend and frontend development servers
npm run dev
```

### Testing

Run unit and SQLite/API integration tests with `npm ci` followed by
`node --test tests/*.test.js tests/integration/*.test.js`.
The CI workflow also runs the React test suite and builds the frontend.
A Chromium browser test job exercises the user interface.

See [test instructions and coverage matrix](docs/testing.md).

## Documentation

- [YAML backup schema and restore behavior](docs/yaml-backup.md)
- [Application status monitoring with Gatus](docs/status-monitoring.md)
- [Large clock fonts and licensing](docs/clock-fonts.md)
- [Quote sources and individual clock colors](docs/quotes-and-clock.md)
- [Settings migration and upgrade/rollback](docs/upgrade.md)
- [Tests, CI and known coverage gaps](docs/testing.md)

## Screenshots

![Apps screenshot](.github/apps.png)

![Bookmarks screenshot](.github/bookmarks.png)

![Settings screenshot](.github/settings.png)

![Themes screenshot](.github/themes.png)

## Usage

### Authentication

Visit [project wiki](https://github.com/pawelmalak/flame/wiki/Authentication) to read more about authentication

### Search bar

#### Searching

The default search setting is to search through all your apps and bookmarks. If you want to search using specific search engine, you need to type your search query with selected prefix. For example, to search for "what is docker" using google search you would type: `/g what is docker`.

For list of supported search engines, shortcuts and more about searching functionality visit [project wiki](https://github.com/pawelmalak/flame/wiki/Search-bar).

### Setting up weather module

1. Obtain API Key from [Weather API](https://www.weatherapi.com/pricing.aspx).
   > Free plan allows for 1M calls per month. Flame is making less then 3K API calls per month.
2. Get lat/long for your location. You can get them from [latlong.net](https://www.latlong.net/convert-address-to-lat-long.html).
3. Enter and save data. Weather widget will now update and should be visible on Home page.

### Docker integration

Enable **Settings > Docker > Use Docker API** and give Flame access to the
Docker daemon. Add labels to the containers that should appear:

```yaml
labels:
  flame.type: application
  flame.name: My service
  flame.url: https://service.example.com
  flame.icon: server
  flame.visible: "true"
```

Multiple applications can use semicolon-separated values. The `flame.visible`
label is optional. If omitted, Flame preserves the app's manually chosen
visibility during synchronization.

**Security:** Mounting the Docker socket gives the container access to
the Docker daemon. Restrict this access and never expose an unauthenticated
daemon over the network. Consult
[Docker daemon security](https://docs.docker.com/engine/security/protect-access/)
for securing remote API connections.

### Kubernetes integration

Enable **Settings > Docker > Use Kubernetes Ingress API** and make sure the
Flame Pod has permission to list Ingress objects. Annotate each Ingress:

```yaml
metadata:
  annotations:
    flame.pawelmalak/type: application
    flame.pawelmalak/name: My service
    flame.pawelmalak/url: https://service.example.com
    flame.pawelmalak/icon: kubernetes
    flame.pawelmalak/visible: "true"
```

The visibility annotation is optional; omitting it preserves an existing
application's manually configured visibility.

### Import HTML Bookmarks (Experimental)

- Requirements
  - python3
  - pip packages: Pillow, beautifulsoup4
- Backup your `db.sqlite` before running script!
- Known Issues:
  - generated icons are sometimes incorrect

```bash
pip3 install Pillow, beautifulsoup4

cd flame/.dev
python3 bookmarks_importer.py --bookmarks <path to bookmarks.html> --data <path to flame data folder>
```

### Custom CSS and themes

See project wiki for [Custom CSS](https://github.com/pawelmalak/flame/wiki/Custom-CSS) and [Custom theme with CSS](https://github.com/pawelmalak/flame/wiki/Custom-theme-with-CSS).
