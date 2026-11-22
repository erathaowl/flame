const App = require('../../../models/App');
const axios = require('axios');
const Logger = require('../../../utils/Logger');
const logger = new Logger();
const loadConfig = require('../../../utils/loadConfig');

const useDocker = async (config) => {
  const {
    useOrdering: orderType,
    unpinStoppedApps,
    dockerHost: host,
  } = config || await loadConfig();

  let containers = null;

  // Get list of containers
  try {
    if (host.includes('localhost')) {
      // Use default host
      let { data } = await axios.get(
        `http://${host}/containers/json?{"status":["running"]}`,
        {
          socketPath: '/var/run/docker.sock',
        }
      );

      containers = data;
    } else {
      // Use custom host
      let { data } = await axios.get(
        `http://${host}/containers/json?{"status":["running"]}`
      );

      containers = data;
    }
  } catch {
    logger.log(`Can't connect to the Docker API on ${host}`, 'ERROR');
  }

  if (containers) {
    const apps = await App.findAll({
      order: [[orderType, 'ASC']],
    });

    // Filter out containers without any annotations
    containers = containers.filter((e) => Object.keys(e.Labels).length !== 0);

    const dockerApps = [];

    for (const container of containers) {
      let labels = container.Labels;

      // Traefik labels for URL configuration
      if (!('flame.url' in labels)) {
        for (const label of Object.keys(labels)) {
          if (/^traefik.*.frontend.rule/.test(label)) {
            // Traefik 1.x
            let value = labels[label];

            if (value.indexOf('Host') !== -1) {
              value = value.split('Host:')[1];
              labels['flame.url'] =
                'https://' + value.split(',').join(';https://');
            }
          } else if (/^traefik.*?\.rule/.test(label)) {
            // Traefik 2.x
            const value = labels[label];

            if (value.indexOf('Host') !== -1) {
              const regex = /\`([a-zA-Z0-9\.\-]+)\`/g;
              const domains = [];

              let match;
              while ((match = regex.exec(value)) !== null) {
                domains.push('http://' + match[1]);
              }

              if (domains.length > 0) {
                labels['flame.url'] = domains.join(';');
              }
            }
          }
        }
      }

      // add each container as flame formatted app
      if (
        'flame.name' in labels &&
        'flame.url' in labels &&
        /^app/.test(labels['flame.type'])
      ) {
        const names = labels['flame.name'].split(';');
        const urls = labels['flame.url'].split(';');
        const icons = labels['flame.icon']?.split(';') || [];
        const descriptions = labels['flame.description']?.split(';') || [];
        const visibility = labels['flame.visible']?.split(';') || [];

        for (let i = 0; i < names.length; i++) {

          const item = {
            name: names[i] || names[0],
            url: urls[i] || urls[0],
            icon: icons[i] || 'docker',
            description: descriptions[i] || '',
          };

          const visibilityValue = visibility[i] || visibility[0];
          if (visibilityValue !== undefined) {
            item.isPublic = /^true$/i.test(visibilityValue) ? 1 : 0;
          }

          dockerApps.push(item);
        }
      }
    }

    if (unpinStoppedApps) {
      await App.update({ isPinned: false }, { where: { isPinned: true } });
    }

    for (const item of dockerApps) {
      // If app already exists, update it
      // Find by name or url
      const app = apps.find((entry) => entry.name === item.name || entry.url === item.url);
      if (app) {

        if (
          item.icon === 'custom' ||
          (item.icon === 'docker' && app.icon != 'docker')
        ) {
          // update without overriding icon
          await app.update({
            name: item.name,
            url: item.url,
            description: item.description,
            ...(item.isPublic !== undefined ? { isPublic: item.isPublic } : {}),
            isPinned: true,
          });
        } else {
          await app.update({
            ...item,
            isPinned: true,
          });
        }
      } else {
        // else create new app
        await App.create({
          ...item,
          icon: item.icon === 'custom' ? 'docker' : item.icon,
          isPinned: true,
        });
      }
    }
  }
};

module.exports = useDocker;
