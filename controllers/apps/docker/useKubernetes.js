const App = require('../../../models/App');
const k8s = require('@kubernetes/client-node');
const Logger = require('../../../utils/Logger');
const logger = new Logger();
const loadConfig = require('../../../utils/loadConfig');

const useKubernetes = async (config) => {
  const { useOrdering: orderType, unpinStoppedApps } = config || await loadConfig();

  let ingresses = null;

  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromCluster();
    const k8sNetworkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);
    const response = await k8sNetworkingV1Api.listIngressForAllNamespaces();
    ingresses = response.body.items;
  } catch {
    logger.log("Can't connect to the Kubernetes API", 'ERROR');
  }

  if (ingresses) {
    const apps = await App.findAll({
      order: [[orderType, 'ASC']],
    });

    ingresses = ingresses.filter(
      (ingress) => ingress.metadata?.annotations && Object.keys(ingress.metadata.annotations).length !== 0
    );

    const kubernetesApps = [];

    for (const ingress of ingresses) {
      const annotations = ingress.metadata.annotations;

      if (
        'flame.pawelmalak/name' in annotations &&
        'flame.pawelmalak/url' in annotations &&
        /^app/.test(annotations['flame.pawelmalak/type'])
      ) {
        const item = {
          name: annotations['flame.pawelmalak/name'],
          url: annotations['flame.pawelmalak/url'],
          icon: annotations['flame.pawelmalak/icon'] || 'kubernetes',
          description: annotations['flame.pawelmalak/description'] || '',
        };

        const visibilityValue = annotations['flame.pawelmalak/visible'];
        if (visibilityValue !== undefined) {
          item.isPublic = /^true$/i.test(visibilityValue) ? 1 : 0;
        }

        kubernetesApps.push(item);
      }
    }

    if (unpinStoppedApps) {
      await App.update({ isPinned: false }, { where: { isPinned: true } });
    }

    for (const item of kubernetesApps) {
      // Find by name or url
      const app = apps.find((entry) => entry.name === item.name || entry.url === item.url);
      if (app) {
        await app.update({ ...item, isPinned: true });
      } else {
        await App.create({
          ...item,
          isPinned: true,
        });
      }
    }
  }
};

module.exports = useKubernetes;
