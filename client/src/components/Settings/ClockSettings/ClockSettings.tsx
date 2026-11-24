import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { State } from '../../../store/reducers';
import { actionCreators } from '../../../store';
import { Config } from '../../../interfaces';
import { configTemplate, applyAuth } from '../../../utility';
import { availableClockFonts } from '../../../utility/clockFonts';
import { clockColor, clockColorOptions } from '../../../utility/clockColors';
import { Button, InputGroup, SettingsHeadline } from '../../UI';

const colors: { key: keyof Config; label: string }[] = [
  { key: 'clockHoursColor', label: 'Hours' },
  { key: 'clockMinutesColor', label: 'Minutes' },
  { key: 'clockSecondsColor', label: 'Seconds' },
  { key: 'clockHourSeparatorColor', label: 'Hours / minutes separator' },
  { key: 'clockMinuteSeparatorColor', label: 'Minutes / seconds separator' },
];

export const ClockSettings = (): JSX.Element => {
  const { config, loading } = useSelector((state: State) => state.config);
  const { getConfig, createNotification } = bindActionCreators(actionCreators, useDispatch());
  const [form, setForm] = useState<Config>(configTemplate);
  const [fonts, setFonts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...config, clockFont: config.clockFont === 'doto' ? 'matrix-mono-screen' : config.clockFont });
  }, [loading]);

  useEffect(() => {
    axios.get<{ data: string[] }>('/api/clock-fonts')
      .then((response) => setFonts(response.data.data))
      .catch(() => setFonts([]));
  }, []);

  const change = (key: keyof Config, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await axios.put('/api/config', {
        largeClock: form.largeClock, clockFont: form.clockFont, clockSize: form.clockSize,
        clockStyle: form.clockStyle,
        ...Object.fromEntries(colors.map(({ key }) => [key, form[key]])),
      }, { headers: applyAuth() });
      await getConfig();
      createNotification({ title: 'Success', message: 'Clock settings saved' });
    } catch {
      createNotification({ title: 'Error', message: 'Failed to save clock settings' });
    } finally {
      setSaving(false);
    }
  };

  const preview = ['clockHoursColor', 'clockHourSeparatorColor', 'clockMinutesColor',
    'clockMinuteSeparatorColor', 'clockSecondsColor'] as (keyof Config)[];

  return (
    <form onSubmit={save}>
      <SettingsHeadline text="Clock" />
      <InputGroup>
        <label htmlFor="largeClock">Header layout</label>
        <select id="largeClock" value={form.largeClock ? 'large' : 'small'}
          onChange={(event) => change('largeClock', event.target.value === 'large')}>
          <option value="small">Large greeting / small date and time</option>
          <option value="large">Large clock / small quote</option>
        </select>
      </InputGroup>
      <InputGroup>
        <label htmlFor="clockFont">Font</label>
        <select id="clockFont" value={form.clockFont || 'default'}
          onChange={(event) => change('clockFont', event.target.value)}>
          {!availableClockFonts(fonts).some((font) => font.value === form.clockFont) &&
            <option value={form.clockFont}>{form.clockFont} (not installed)</option>}
          {availableClockFonts(fonts).map(({ value, label }) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
      </InputGroup>
      <InputGroup>
        <label htmlFor="clockSize">Size</label>
        <select id="clockSize" value={form.clockSize || 'auto'}
          onChange={(event) => change('clockSize', event.target.value)}>
          <option value="auto">Auto (matches weather height)</option>
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra large</option>
        </select>
      </InputGroup>
      <InputGroup>
        <label htmlFor="clockStyle">Style</label>
        <select id="clockStyle" value={form.clockStyle || 'bold'}
          onChange={(event) => change('clockStyle', event.target.value)}>
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
          <option value="bold-italic">Bold italic</option>
        </select>
      </InputGroup>
      <SettingsHeadline text="Individual element colors" />
      <p style={{ marginBottom: 16 }}>Theme colors update automatically when you change the theme. Custom HEX colors stay fixed.</p>
      {colors.map(({ key, label }) => {
        const value = String(form[key] || 'primary');
        const custom = value.startsWith('#');
        return (
          <InputGroup key={key}>
            <label htmlFor={key}>{label}</label>
            <select id={key} value={custom ? 'custom' : value}
              onChange={(event) => change(key, event.target.value === 'custom' ? '#FFFFFF' : event.target.value)}>
              {clockColorOptions.map(({ value: option, label: name }) =>
                <option key={option} value={option}>{name}</option>)}
              <option value="custom">Custom HEX</option>
            </select>
            {custom && <>
              <label htmlFor={key + 'Hex'}>HEX color for {label.toLowerCase()}</label>
              <input id={key + 'Hex'} type="text" value={value} maxLength={7}
                placeholder="#RRGGBB" pattern="#[0-9a-fA-F]{6}" required
                onChange={(event) => change(key, event.target.value)} />
              <input type="color" aria-label={label + ' color picker'}
                value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#FFFFFF'}
                onChange={(event) => change(key, event.target.value)} />
            </>}
          </InputGroup>
        );
      })}
      <div aria-label="Clock color preview" style={{ fontSize: '2.5rem', fontWeight: 700, margin: '24px 0', whiteSpace: 'nowrap' }}>
        {['12', ':', '34', ':', '56'].map((part, index) =>
          <span key={index} data-clock-color={preview[index]}
            style={{ color: clockColor(String(form[preview[index]] || 'primary')) }}>{part}</span>)}
      </div>
      <Button disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
    </form>
  );
};
