import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';
import { applyAuth } from '../../../utility';
import { Button, InputGroup, SettingsHeadline } from '../../UI';

export const QuoteSettings = (): JSX.Element => {
  const [quotes, setQuotes] = useState('');
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();
  const { createNotification } = bindActionCreators(actionCreators, dispatch);

  useEffect(() => {
    axios.get<{ data: string[] }>('/api/quotes', { headers: applyAuth() })
      .then((response) => setQuotes(response.data.data.join('\n')))
      .catch(() => createNotification({
        title: 'Error',
        message: 'Failed to load quotes',
      }));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const entries = quotes.split('\n').map((text) => text.trim()).filter(Boolean);
    setSaving(true);
    try {
      await axios.put('/api/quotes', { quotes: entries }, { headers: applyAuth() });
      createNotification({ title: 'Success', message: `Saved ${entries.length} quotes` });
    } catch {
      createNotification({ title: 'Error', message: 'Failed to save quotes' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <SettingsHeadline text="Quote library" />
      <InputGroup>
        <label htmlFor="quotes">Quotes (one per line)</label>
        <textarea
          id="quotes"
          value={quotes}
          onChange={(event) => setQuotes(event.target.value)}
          rows={10}
          style={{ height: '220px' }}
        />
        <span>Store any number of quotes. The homepage picks one randomly when opened. Empty library uses the greeting text.</span>
      </InputGroup>
      <Button>{saving ? 'Saving...' : 'Save quotes'}</Button>
    </form>
  );
};
