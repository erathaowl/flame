const yaml = require('js-yaml');

const requiredText = (value, field) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 255) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
};

const optionalText = (value, field) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > 255) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
};

const requiredBoolean = (value, field) => {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${field}`);
  return value;
};

const order = (value, index) => {
  if (value === undefined || value === null) return index + 1;
  if (!Number.isInteger(value) || value < 0) throw new Error('Invalid orderId');
  return value;
};

const parseBackup = (text) => {
  const data = yaml.load(text, { json: true });
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      data.version !== 1 || !Array.isArray(data.applications) ||
      !Array.isArray(data.categories) ||
      !['name', 'orderId', 'createdAt'].includes(data.sorting)) {
    throw new Error('Unsupported backup format');
  }

  const applications = data.applications.map((app, index) => ({
    name: requiredText(app.name, 'application name'),
    url: requiredText(app.url, 'application URL'),
    icon: optionalText(app.icon, 'application icon') || 'cancel',
    description: optionalText(app.description, 'application description'),
    statusEndpoint: optionalText(app.statusEndpoint, 'status endpoint'),
    isPublic: requiredBoolean(app.isPublic, 'application visibility'),
    isPinned: requiredBoolean(app.isPinned, 'application pin'),
    orderId: order(app.orderId, index),
  }));

  const categories = data.categories.map((category, index) => {
    if (!Array.isArray(category.bookmarks)) throw new Error('Invalid bookmarks');
    return {
      name: requiredText(category.name, 'category name'),
      isPublic: requiredBoolean(category.isPublic, 'category visibility'),
      isPinned: requiredBoolean(category.isPinned, 'category pin'),
      orderId: order(category.orderId, index),
      bookmarks: category.bookmarks.map((bookmark, bookmarkIndex) => ({
        name: requiredText(bookmark.name, 'bookmark name'),
        url: requiredText(bookmark.url, 'bookmark URL'),
        icon: optionalText(bookmark.icon, 'bookmark icon'),
        isPublic: requiredBoolean(bookmark.isPublic, 'bookmark visibility'),
        orderId: order(bookmark.orderId, bookmarkIndex),
      })),
    };
  });

  return { applications, categories, sorting: data.sorting };
};

const exportBackup = ({ applications, categories, sorting }) => {
  const backup = {
    version: 1,
    sorting,
    applications: applications.map((app) => ({
      name: app.name,
      url: app.url,
      icon: app.icon,
      description: app.description,
      statusEndpoint: app.statusEndpoint || '',
      isPublic: !!app.isPublic,
      isPinned: !!app.isPinned,
      orderId: app.orderId,
    })),
    categories: categories.map((category) => ({
      name: category.name,
      isPublic: !!category.isPublic,
      isPinned: !!category.isPinned,
      orderId: category.orderId,
      bookmarks: category.bookmarks.map((bookmark) => ({
        name: bookmark.name,
        url: bookmark.url,
        icon: bookmark.icon,
        isPublic: !!bookmark.isPublic,
        orderId: bookmark.orderId,
      })),
    })),
  };
  return yaml.dump(backup, { noRefs: true, lineWidth: -1 });
};

module.exports = { parseBackup, exportBackup };
