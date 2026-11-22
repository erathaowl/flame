const getStatus = (endpoint) => {
  const results = Array.isArray(endpoint.results) ? endpoint.results : [];
  if (!results.length) return 'yellow';

  const recent = results
    .filter((result) => typeof result.success === 'boolean')
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 3);

  if (!recent.length) return 'yellow';
  if (!recent[0].success) return 'red';
  return recent.some((result) => !result.success) ? 'yellow' : 'green';
};

module.exports = { getStatus };
