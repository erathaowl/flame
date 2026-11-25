import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { State } from '../../../store/reducers';
import { actionCreators } from '../../../store';
import { applyAuth } from '../../../utility';
import { Button, InputGroup, SettingsHeadline } from '../../UI';

type Source = {
  source: string;
  url: string;
  authMode: string;
  queryName: string;
  textPath: string;
  authorPath: string;
};

type CustomHeader = { name: string; value?: string };
type SourceStatus = { hasSecret: boolean; headerNames: string[] };

const initialSource: Source = {
  source: 'local', url: '', authMode: 'none', queryName: 'api_key',
  textPath: '$.quote', authorPath: '$.author',
};

export const QuotesSettings = (): JSX.Element => {
  const { config, loading } = useSelector((state: State) => state.config);
  const { getConfig, createNotification } = bindActionCreators(actionCreators, useDispatch());
  const [source, setSource] = useState<Source>(initialSource);
  const [quotes, setQuotes] = useState('');
  const [style, setStyle] = useState('normal');
  const [authValue, setAuthValue] = useState('');
  const [secretChanged, setSecretChanged] = useState(false);
  const [hasSecret, setHasSecret] = useState(false);
  const [headers, setHeaders] = useState<CustomHeader[]>([]);
  const [savedHeaderNames, setSavedHeaderNames] = useState<string[]>([]);
  const [result, setResult] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSource({
      source: config.quoteSource || 'local',
      url: config.quoteEndpointUrl || '',
      authMode: config.quoteEndpointAuthMode || 'none',
      queryName: config.quoteEndpointQueryName || 'api_key',
      textPath: config.quoteTextPath || '$.quote',
      authorPath: config.quoteAuthorPath || '',
    });
    setStyle(config.quoteStyle || 'normal');
  }, [loading]);

  useEffect(() => {
    let active = true;
    Promise.all([
      axios.get<{ data: string[] }>('/api/quotes', { headers: applyAuth() }),
      axios.get<{ data: SourceStatus }>('/api/quotes/source', { headers: applyAuth() }),
    ]).then(([library, settings]) => {
      if (!active) return;
      setQuotes(library.data.data.join('\n'));
      setHasSecret(settings.data.data.hasSecret);
      setSavedHeaderNames(settings.data.data.headerNames);
      setHeaders(settings.data.data.headerNames.map((name) => ({ name })));
      setLoaded(true);
    }).catch(() => createNotification({ title: 'Error', message: 'Failed to load quote settings' }));
    return () => { active = false; };
  }, []);

  const change = (key: keyof Source, value: string) =>
    setSource((current) => ({ ...current, [key]: value }));

  const updateHeader = (index: number, change: Partial<CustomHeader>) =>
    setHeaders((current) => current.map((header, i) =>
      i === index ? { ...header, ...change } : header
    ));

  const test = async () => {
    if (testing || !loaded) return;
    setTesting(true);
    setResult('');
    try {
      const response = await axios.post<{ data: { quote: string; matchCount: number } }>(
        '/api/quotes/test',
        { ...source, headers, ...(secretChanged ? { authValue } : {}) },
        { headers: applyAuth() }
      );
      setResult(`Found ${response.data.data.matchCount} quote(s). Preview: ${response.data.data.quote}`);
    } catch (error) {
      if (axios.isAxiosError(error)) setResult(error.response?.data?.error || 'Request failed');
      else setResult('Request failed');
    } finally {
      setTesting(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !loaded) return;
    setSaving(true);
    try {
      const response = await axios.put<{ data: SourceStatus }>('/api/quotes/source', {
        ...source, headers, ...(secretChanged ? { authValue } : {}),
      }, { headers: applyAuth() });
      await axios.put('/api/interface', {
        config: { quoteStyle: style },
        quotes: quotes.split('\n').map((item) => item.trim()).filter(Boolean),
      }, { headers: applyAuth() });
      setSecretChanged(false);
      setHasSecret(response.data.data.hasSecret);
      setSavedHeaderNames(response.data.data.headerNames);
      setHeaders(response.data.data.headerNames.map((name) => ({ name })));
      setAuthValue('');
      await getConfig();
      createNotification({ title: 'Success', message: 'Quote settings saved' });
    } catch (error) {
      createNotification({ title: 'Error', message: axios.isAxiosError(error)
        ? error.response?.data?.error || 'Failed to save quote settings'
        : 'Failed to save quote settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <SettingsHeadline text="Quotes" />
      <InputGroup>
        <label htmlFor="quoteSource">Quote source</label>
        <select id="quoteSource" value={source.source}
          onChange={(event) => change('source', event.target.value)}>
          <option value="local">Local library</option>
          <option value="endpoint">JSON endpoint</option>
        </select>
        <span>The local library is preserved when you select an endpoint.</span>
      </InputGroup>
      <InputGroup>
        <label htmlFor="quoteStyle">Quote style</label>
        <select id="quoteStyle" value={style} onChange={(event) => setStyle(event.target.value)}>
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
          <option value="dimmed">Dimmed</option>
          <option value="italic-dimmed">Italic dimmed</option>
        </select>
      </InputGroup>
      {source.source === 'local' ? (
        <>
          <SettingsHeadline text="Quote library" />
          <InputGroup>
            <label htmlFor="quotes">Quotes (one per line)</label>
            <textarea id="quotes" rows={10} value={quotes}
              onChange={(event) => setQuotes(event.target.value)} />
            <span>One quote is selected randomly on each page load.</span>
          </InputGroup>
        </>
      ) : (
        <>
          <SettingsHeadline text="Endpoint connection" />
          <InputGroup>
            <label htmlFor="quoteEndpointUrl">Endpoint URL</label>
            <input id="quoteEndpointUrl" type="url" required value={source.url}
              placeholder="https://example.org/api/quotes"
              onChange={(event) => change('url', event.target.value)} />
          </InputGroup>
          <InputGroup>
            <label htmlFor="quoteAuthMode">Authentication</label>
            <select id="quoteAuthMode" value={source.authMode}
              onChange={(event) => change('authMode', event.target.value)}>
              <option value="none">None</option>
              <option value="query">Query string parameter</option>
              <option value="bearer">Bearer token</option>
            </select>
          </InputGroup>
          {source.authMode === 'query' && (
            <InputGroup>
              <label htmlFor="quoteQueryName">Query parameter name</label>
              <input id="quoteQueryName" value={source.queryName} required
                onChange={(event) => change('queryName', event.target.value)} />
            </InputGroup>
          )}
          {source.authMode !== 'none' && (
            <InputGroup>
              <label htmlFor="quoteAuthValue">Authentication value</label>
              <input id="quoteAuthValue" type="password" autoComplete="new-password"
                placeholder={hasSecret ? 'Saved (leave blank to keep)' : 'Enter token'}
                value={authValue}
                onChange={(event) => { setAuthValue(event.target.value); setSecretChanged(true); }} />
              <span>The credential is stored on the server and excluded from public configuration.</span>
              {hasSecret && <Button type="button" click={() => {
                setAuthValue(''); setSecretChanged(true); setHasSecret(false);
              }}>Clear saved credential</Button>}
            </InputGroup>
          )}
          <SettingsHeadline text="Custom HTTP headers" />
          <p style={{ marginBottom: 16 }}>
            Optional request headers, such as Authorization, X-API-Key or Accept.
            They can be combined with the authentication settings above.
            Values are stored on the server and never returned to the browser.
          </p>
          {headers.map((header, index) => {
            const saved = savedHeaderNames.some((name) =>
              name.toLowerCase() === header.name.trim().toLowerCase()
            );
            return (
              <InputGroup key={index}>
                <label htmlFor={`quoteHeaderName${index}`}>Header name {index + 1}</label>
                <input id={`quoteHeaderName${index}`} required maxLength={128}
                  placeholder="X-API-Key" value={header.name}
                  onChange={(event) => updateHeader(index, { name: event.target.value })} />
                <label htmlFor={`quoteHeaderValue${index}`}>Header value {index + 1}</label>
                <input id={`quoteHeaderValue${index}`} type="password" autoComplete="new-password"
                  maxLength={2048} value={header.value ?? ''}
                  placeholder={saved && header.value === undefined ? 'Saved (leave unchanged to keep)' : 'Header value'}
                  onChange={(event) => updateHeader(index, { value: event.target.value })} />
                <Button type="button" click={() => setHeaders((current) =>
                  current.filter((_, i) => i !== index)
                )}>Remove header {index + 1}</Button>
              </InputGroup>
            );
          })}
          <div style={{ marginBottom: 20 }}>
            <Button type="button" disabled={!loaded || headers.length >= 32}
              click={() => setHeaders((current) => [...current, { name: '', value: '' }])}>
              Add header
            </Button>
          </div>
          <SettingsHeadline text="JSONPath extraction" />
          <InputGroup>
            <label htmlFor="quoteTextPath">Quote JSONPath</label>
            <input id="quoteTextPath" required value={source.textPath}
              placeholder="$.data[*].text"
              onChange={(event) => change('textPath', event.target.value)} />
          </InputGroup>
          <InputGroup>
            <label htmlFor="quoteAuthorPath">Author JSONPath (optional)</label>
            <input id="quoteAuthorPath" value={source.authorPath}
              placeholder="$.data[*].author"
              onChange={(event) => change('authorPath', event.target.value)} />
            <span>Supports object properties, array indexes and [*] wildcards. Authors are appended in parentheses.</span>
          </InputGroup>
          <div style={{ marginBottom: 16 }}>
            <Button type="button" disabled={!loaded || testing} click={test}>
              {testing ? 'Testing...' : 'Test endpoint'}
            </Button>
          </div>
          {result && <p aria-live="polite" style={{
            marginBottom: 20, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          }}>{result}</p>}
          <p style={{ marginBottom: 16 }}>
            If the endpoint is unavailable, the local library is used as a fallback.
          </p>
        </>
      )}
      <Button disabled={!loaded || saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
    </form>
  );
};
