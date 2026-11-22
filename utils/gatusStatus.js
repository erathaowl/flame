const getStatus = (payload) => {
  if (!payload || Array.isArray(payload) || !Array.isArray(payload.results)) {
    return 'yellow';
  }

  const results = payload.results
    .filter((result) =>
      result && typeof result.success === 'boolean' &&
      typeof result.timestamp === 'string' &&
      Number.isFinite(Date.parse(result.timestamp))
    )
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 3);

  if (!results.length) return 'yellow';
  if (!results[0].success) return 'red';
  return results.some((result) => !result.success) ? 'yellow' : 'green';
};

const isGatusUrl = (value) => {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      /^\/api\/v1\/endpoints\/[^/]+\/statuses\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
};

module.exports = { getStatus, isGatusUrl };
