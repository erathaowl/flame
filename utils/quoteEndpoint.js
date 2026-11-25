const axios = require('axios');
const { validateHeaderName, validateHeaderValue } = require('node:http');
const Setting = require('../models/Setting');
const loadConfig = require('./loadConfig');

const secretKey = 'quoteEndpointSecret';
const headersKey = 'quoteEndpointHeaders';

const readHeaders = async () => {
  const row = await Setting.findByPk(headersKey);
  return row ? JSON.parse(row.value) : [];
};

// Reserve transport headers and keys used internally by Axios 0.x.
const reservedHeaders = new Set([
  'host', 'connection', 'content-length', 'transfer-encoding', 'upgrade',
  'expect', 'te', 'trailer', 'keep-alive', 'proxy-connection', 'proxy-authorization',
  'common', 'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
  '__proto__', 'constructor', 'prototype',
]);

const resolveHeaders = (draft, saved = []) => {
  if (draft === undefined) return saved;
  if (!Array.isArray(draft) || draft.length > 32) {
    throw new Error('Invalid custom headers (maximum 32)');
  }

  const seen = new Set();
  const headers = draft.map((header) => {
    if (!header || typeof header.name !== 'string') {
      throw new Error('Invalid custom header name');
    }
    const name = header.name.trim();
    const key = name.toLowerCase();
    if (!name || name.length > 128 || reservedHeaders.has(key) || seen.has(key)) {
      throw new Error('Invalid, reserved or duplicate custom header name');
    }
    try {
      validateHeaderName(name);
    } catch {
      throw new Error('Invalid custom header name');
    }
    seen.add(key);
    const value = header.value === undefined
      ? saved.find((item) => item.name.toLowerCase() === key)?.value
      : header.value;
    if (typeof value !== 'string' || value.length > 2048) {
      throw new Error('Invalid or missing custom header value');
    }
    try {
      validateHeaderValue(name, value);
    } catch {
      throw new Error('Invalid custom header value');
    }
    return { name, value };
  });
  if (headers.reduce((size, { name, value }) => size + name.length + value.length + 4, 0) > 8192) {
    throw new Error('Invalid custom headers (maximum total size 8192 characters)');
  }
  return headers;
};

const saveHeaders = async (headers, transaction) => {
  if (headers.length) {
    await Setting.upsert({
      key: headersKey, value: JSON.stringify(headers), valueType: 'string',
    }, { transaction });
  } else {
    await Setting.destroy({ where: { key: headersKey }, transaction });
  }
};

const readSecret = async () => (await Setting.findByPk(secretKey))?.value || '';

const saveSecret = async (value, transaction) => {
  if (value === undefined) return;
  if (typeof value !== 'string' || value.length > 2048) {
    throw new Error('Invalid authentication value');
  }
  if (value) {
    await Setting.upsert({ key: secretKey, value, valueType: 'string' }, { transaction });
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

const fetchQuote = async (source, secret, customHeaders = []) => {
  const parsed = validateSource(source);
  const headers = { Accept: 'application/json' };
  if (source.authMode === 'query' && secret) parsed.searchParams.set(source.queryName, secret);
  if (source.authMode === 'bearer' && secret) headers.Authorization = `Bearer ${secret}`;
  for (const { name, value } of customHeaders) {
    const key = Object.keys(headers).find((existing) => existing.toLowerCase() === name.toLowerCase()) || name.toLowerCase();
    headers[key] = value;
  }
  const response = await axios.get(parsed.toString(), {
    headers, timeout: 5000, maxRedirects: 0, maxContentLength: 262144,
    responseType: 'json', transitional: { silentJSONParsing: false },
  });
  if (typeof response.data !== 'object' || response.data === null) {
    throw new Error('Endpoint must return JSON');
  }
  return extractQuote(response.data, source.textPath, source.authorPath);
};

const currentSource = async (config) => {
  config = config || await loadConfig();
  return {
    url: config.quoteEndpointUrl, authMode: config.quoteEndpointAuthMode,
    queryName: config.quoteEndpointQueryName, textPath: config.quoteTextPath,
    authorPath: config.quoteAuthorPath,
  };
};

module.exports = { readSecret, saveSecret, readHeaders, resolveHeaders, saveHeaders, validateSource, fetchQuote, currentSource, extractQuote, selectPath };
