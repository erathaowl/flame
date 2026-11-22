import { ChangeEvent, useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';
import { applyAuth } from '../../../utility';
import { InputGroup, SettingsHeadline } from '../../UI';

export const BackupSettings = (): JSX.Element => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dispatch = useDispatch();
  const { getApps, getCategories, getConfig } = bindActionCreators(actionCreators, dispatch);

  const exportYaml = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await axios.get<Blob>('/api/backup', {
        headers: applyAuth(),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'flame-backup.yaml';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Backup exported successfully.');
    } catch {
      setMessage('Failed to export the backup.');
    } finally {
      setBusy(false);
    }
  };

  const importYaml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!window.confirm(
      'Replace all applications, categories and bookmarks with the contents of this file? Export a backup first. This cannot be undone.'
    )) return;

    setBusy(true);
    setMessage('');
    try {
      const content = await file.text();
      const response = await axios.post<{
        data: { applications: number; categories: number; bookmarks: number };
      }>('/api/backup', content, {
        headers: { ...applyAuth(), 'Content-Type': 'application/x-yaml' },
      });
      await Promise.all([getApps(), getCategories(), getConfig()]);
      const { applications, categories, bookmarks } = response.data.data;
      setMessage(`Imported ${applications} applications, ${categories} categories and ${bookmarks} bookmarks.`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.error || 'Failed to import the backup.');
      } else {
        setMessage('Failed to import the backup.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <SettingsHeadline text="Applications and bookmarks backup" />
      <p>Export or restore all applications, categories and bookmarks as YAML, including visibility, pinning and custom order.</p>
      <button type="button" onClick={exportYaml} disabled={busy}>
        Export YAML
      </button>
      <InputGroup>
        <label htmlFor="backupFile">Import YAML (replaces existing entries)</label>
        <input
          id="backupFile"
          type="file"
          accept=".yaml,.yml,text/yaml,application/x-yaml"
          onChange={importYaml}
          disabled={busy}
        />
        <span>Uploaded custom icon files are not part of the YAML backup.</span>
      </InputGroup>
      {message && <p role="status">{message}</p>}
    </section>
  );
};
