const axios = require('axios');
const Setting = require('../models/Setting');
const loadConfig = require('./loadConfig');

const secretKey = 'quoteEndpointSecret';

const readSecret = async () => (await Setting.findByPk(secretKey))?.value || '';

const saveSecret = async (value, transaction) => {
  if (value === undefined) return;
  if (typeof value !== 'string' || value.length > 2048) {
    throw new Error('Invalid authentication value');
  }
  if (value) {
    await Setting.upsert({ key: secretKey, value, valueType: 'secret' }, { transaction });
  } else {
    await Setting.destroy({ where: { key: secretKey }, transaction });
  }
};

const selectPath = (document, path) => {
  if (typeof path !== 'string' || !path.startsWith('$') || path.length > 256) {
    throw new Error('Invalid JSONPath');
  }
  const tokens = [];
  let rest = path.slice(1);
  while (rest) {
    const match = rest.match(/^(?:\.([A-Za-z_][\w-]*)|\[['"]([^'"]+)['"]\]|\[(\d+|\*)\]|\.\*)/);
    if (!match) throw new Error('Unsupported JSONPath syntax');
    const token = match[1] || match[2] || match[3] || '*';
    if (['__proto__', 'constructor', 'prototype'].includes(token)) throw new Error('Invalid JSONPath');
    tokens.push(token);
    rest = rest.slice(match[0].length);
  }
  return tokens.reduce((nodes, token) => nodes.flatMap((node) => {
    if (token === '*') return node && typeof node === 'object'
      ? Object.values(node) : [];
    if (node === null || typeof node !== 'object') return [];
    const key = Array.isArray(node) && /^\d+$/.test(token) ? Number(token) : token;
    return Object.prototype.hasOwnProperty.call(node, key) ? [node[key]] : [];
  }), [document]);
};

const extractQuote = (payload, textPath, authorPath) => {
  const texts = selectPath(payload, textPath);
  const authors = authorPath ? selectPath(payload, authorPath) : [];
  const entries = texts.map((text, index) => ({
    text: typeof text === 'string' ? text.trim() : '',
    author: typeof (authors[index] ?? authors[0]) === 'string'
      ? (authors[index] ?? authors[0]).trim() : '',
  })).filter(({ text }) => text);
  if (!entries.length) throw new Error('No quote matched the JSONPath');
  const { text, author } = entries[Math.floor(Math.random() * entries.length)];
  return { text, author, quote: author ? `${text} (${author})` : text, matchCount: entries.length };
};

const validateSource = (source) => {
  const { url, authMode, queryName, textPath, authorPath } = source;
  if (!['none', 'query', 'bearer'].includes(authMode)) throw new Error('Invalid authentication mode');
  if (typeof url !== 'string' || url.length > 2048) throw new Error('Invalid endpoint URL');
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only HTTP(S) URLs without embedded credentials are supported');
  }
  if (authMode === 'query' && (!/^[\w-]{1,64}$/.test(queryName))) {
    throw new Error('Invalid query parameter name');
  }
  selectPath({}, textPath);
  if (authorPath) selectPath({}, authorPath);
  return parsed;
};

const fetchQuote = async (source, secret) => {
  const parsed = validateSource(source);
  const headers = { Accept: 'application/json' };
  if (source.authMode === 'query' && secret) parsed.searchParams.set(source.queryName, secret);
  if (source.authMode === 'bearer' && secret) headers.Authorization = `Bearer ${secret}`;
  const response = await axios.get(parsed.toString(), {
    headers, timeout: 5000, maxRedirects: 0, maxContentLength: 262144,
    responseType: 'json', transitional: { silentJSONParsing: false },
  });
  if (typeof response.data !== 'object' || response.data === null) {
    throw new Error('Endpoint must return JSON');
  }
  return extractQuote(response.data, source.textPath, source.authorPath);
};

const currentSource = async () => {
  const config = await loadConfig();
  return {
    url: config.quoteEndpointUrl, authMode: config.quoteEndpointAuthMode,
    queryName: config.quoteEndpointQueryName, textPath: config.quoteTextPath,
    authorPath: config.quoteAuthorPath,
  };
};

module.exports = { readSecret, saveSecret, validateSource, fetchQuote, currentSource, extractQuote, selectPath };
