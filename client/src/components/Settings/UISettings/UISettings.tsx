import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { UISettingsForm } from '../../../interfaces';

// UI
import { InputGroup, Button, SettingsHeadline } from '../../UI';

// Utils
import { uiSettingsTemplate, inputHandler, applyAuth } from '../../../utility';
import { availableClockFonts } from '../../../utility/clockFonts';
import { QuoteSettings } from './QuoteSettings';

export const UISettings = (): JSX.Element => {
  const { loading, config } = useSelector((state: State) => state.config);

  const dispatch = useDispatch();
  const { getConfig, createNotification } = bindActionCreators(actionCreators, dispatch);

  // Initial state
  const [formData, setFormData] = useState<UISettingsForm>(uiSettingsTemplate);
  const [quotes, setQuotes] = useState('');
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installedClockFonts, setInstalledClockFonts] = useState<string[]>([]);
  const [clockFontsLoaded, setClockFontsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get<{ data: string[] }>('/api/clock-fonts')
      .then((response) => {
        if (active) setInstalledClockFonts(response.data.data);
      })
      .catch(() => {
        if (active) createNotification({ title: 'Error', message: 'Failed to list installed clock fonts' });
      })
      .finally(() => {
        if (active) setClockFontsLoaded(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    axios.get<{ data: string[] }>('/api/quotes', { headers: applyAuth() })
      .then((response) => {
        if (active) {
          setQuotes(response.data.data.join('\n'));
          setQuotesLoaded(true);
        }
      })
      .catch(() => {
        if (active) createNotification({ title: 'Error', message: 'Failed to load quotes' });
      });
    return () => { active = false; };
  }, []);

  // Get config
  useEffect(() => {
    setFormData({
      ...config,
      clockFont: config.clockFont === 'doto' ? 'matrix-mono-screen' : config.clockFont,
    });
  }, [loading]);

  // Form handler
  const formSubmitHandler = async (e: FormEvent) => {
    e.preventDefault();

    if (!quotesLoaded || saving) return;
    setSaving(true);
    try {
      await axios.put('/api/interface', {
        config: formData,
        quotes: quotes.split('\n').map((text) => text.trim()).filter(Boolean),
      }, { headers: applyAuth() });
      await getConfig();
      document.title = formData.customTitle;
      createNotification({ title: 'Success', message: 'Interface settings saved' });
    } catch {
      createNotification({ title: 'Error', message: 'Failed to save interface settings' });
    } finally {
      setSaving(false);
    }
  };

  // Input handler
  const inputChangeHandler = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options?: { isNumber?: boolean; isBool?: boolean }
  ) => {
    inputHandler<UISettingsForm>({
      e,
      options,
      setStateHandler: setFormData,
      state: formData,
    });
  };

  const visibleClockFonts = availableClockFonts(installedClockFonts);
  const selectedClockFontAvailable = visibleClockFonts.some((font) => font.value === formData.clockFont);

  return (
    <>
      <form onSubmit={(e) => formSubmitHandler(e)}>
        {/* === OTHER OPTIONS === */}
        <SettingsHeadline text="Miscellaneous" />
        {/* PAGE TITLE */}
        <InputGroup>
          <label htmlFor="customTitle">Custom page title</label>
          <input
            type="text"
            id="customTitle"
            name="customTitle"
            placeholder="Flame"
            value={formData.customTitle}
            onChange={(e) => inputChangeHandler(e)}
          />
        </InputGroup>
  
        {/* === SEARCH OPTIONS === */}
        <SettingsHeadline text="Search" />
        {/* HIDE SEARCHBAR */}
        <InputGroup>
          <label htmlFor="hideSearch">Hide search bar</label>
          <select
            id="hideSearch"
            name="hideSearch"
            value={formData.hideSearch ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>True</option>
            <option value={0}>False</option>
          </select>
        </InputGroup>
  
        {/* AUTOFOCUS SEARCHBAR */}
        <InputGroup>
          <label htmlFor="disableAutofocus">Disable search bar autofocus</label>
          <select
            id="disableAutofocus"
            name="disableAutofocus"
            value={formData.disableAutofocus ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>True</option>
            <option value={0}>False</option>
          </select>
        </InputGroup>
  
        {/* === HEADER OPTIONS === */}
        <SettingsHeadline text="Header" />
        {/* HIDE HEADER */}
        <InputGroup>
          <label htmlFor="hideHeader">
            Hide headline (greetings and weather)
          </label>
          <select
            id="hideHeader"
            name="hideHeader"
            value={formData.hideHeader ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>True</option>
            <option value={0}>False</option>
          </select>
        </InputGroup>
  
        {/* HIDE DATE */}
        <InputGroup>
          <label htmlFor="hideDate">Hide date</label>
          <select
            id="hideDate"
            name="hideDate"
            value={formData.hideDate ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>True</option>
            <option value={0}>False</option>
          </select>
        </InputGroup>
  
        {/* HIDE TIME */}
        <InputGroup>
          <label htmlFor="showTime">Hide time</label>
          <select
            id="showTime"
            name="showTime"
            value={formData.showTime ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={0}>True</option>
            <option value={1}>False</option>
          </select>
        </InputGroup>
  
        {/* DATE FORMAT */}
        <InputGroup>
          <label htmlFor="useAmericanDate">Date formatting</label>
          <select
            id="useAmericanDate"
            name="useAmericanDate"
            value={formData.useAmericanDate ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>Friday, October 22 2021</option>
            <option value={0}>Friday, 22 October 2021</option>
          </select>
        </InputGroup>
  
        {/* CLOCK LAYOUT */}
        <InputGroup>
          <label htmlFor="largeClock">Header layout</label>
          <select
            id="largeClock"
            name="largeClock"
            value={formData.largeClock ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={0}>Large greeting / small date and time</option>
            <option value={1}>Large clock / small quote</option>
          </select>
        </InputGroup>
  
        {/* CUSTOM GREETINGS */}
        <InputGroup>
          <label htmlFor="greetingsSchema">Custom greetings</label>
          <input
            type="text"
            id="greetingsSchema"
            name="greetingsSchema"
            placeholder="Good day;Hi;Bye!"
            value={formData.greetingsSchema}
            onChange={(e) => inputChangeHandler(e)}
          />
          <span>
            Greetings must be separated with semicolon. All 4 messages must be
            filled, even if they are the same
          </span>
        </InputGroup>
  
        {/* CUSTOM DAYS */}
        <InputGroup>
          <label htmlFor="daySchema">Custom weekday names</label>
          <input
            type="text"
            id="daySchema"
            name="daySchema"
            placeholder="Sunday;Monday;Tuesday"
            value={formData.daySchema}
            onChange={(e) => inputChangeHandler(e)}
          />
          <span>Names must be separated with semicolon</span>
        </InputGroup>
  
        {/* CUSTOM MONTHS */}
        <InputGroup>
          <label htmlFor="monthSchema">Custom month names</label>
          <input
            type="text"
            id="monthSchema"
            name="monthSchema"
            placeholder="January;February;March"
            value={formData.monthSchema}
            onChange={(e) => inputChangeHandler(e)}
          />
          <span>Names must be separated with semicolon</span>
        </InputGroup>
  
        {/* === CLOCK OPTIONS === */}
        <SettingsHeadline text="Clock" />
        <InputGroup>
          <label htmlFor="clockFont">Font</label>
          <select
            id="clockFont"
            name="clockFont"
            value={formData.clockFont || 'default'}
            onChange={(e) => inputChangeHandler(e)}
          >
            {!selectedClockFontAvailable && formData.clockFont && (
              <option value={formData.clockFont} disabled>
                {formData.clockFont} (not installed)
              </option>
            )}
            {visibleClockFonts.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <span>
            {clockFontsLoaded
              ? 'System and bundled fonts are always listed. Optional LCD and custom fonts appear when installed in data/clock-fonts.'
              : 'Checking installed clock fonts...'}
          </span>
        </InputGroup>

        <InputGroup>
          <label htmlFor="clockSize">Size</label>
          <select
            id="clockSize"
            name="clockSize"
            value={formData.clockSize || 'auto'}
            onChange={(e) => inputChangeHandler(e)}
          >
            <option value="auto">Auto (default, matches weather height)</option>
            <option value="small">Small</option>
            <option value="normal">Normal</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra large</option>
          </select>
        </InputGroup>

        <InputGroup>
          <label htmlFor="clockStyle">Style</label>
          <select
            id="clockStyle"
            name="clockStyle"
            value={formData.clockStyle || 'bold'}
            onChange={(e) => inputChangeHandler(e)}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold (default)</option>
            <option value="italic">Italic</option>
            <option value="bold-italic">Bold italic</option>
          </select>
          <span>These settings apply to the large clock layout.</span>
        </InputGroup>

        {/* === SECTIONS OPTIONS === */}
        <SettingsHeadline text="Sections" />
        {/* HIDE APPS */}
        <InputGroup>
          <label htmlFor="hideApps">Hide applications</label>
          <select
            id="hideApps"
            name="hideApps"
            value={formData.hideApps ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>True</option>
            <option value={0}>False</option>
          </select>
        </InputGroup>
  
        {/* HIDE BOOKMARK CATEGORIES */}
        <InputGroup>
          <label htmlFor="hideCategories">Hide bookmarks</label>
          <select
            id="hideCategories"
            name="hideCategories"
            value={formData.hideCategories ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>True</option>
            <option value={0}>False</option>
          </select>
        </InputGroup>
  
        <QuoteSettings
          quotes={quotes}
          onChange={setQuotes}
          style={formData.quoteStyle || 'normal'}
          onStyleChange={(value) => setFormData({ ...formData, quoteStyle: value })}
        />
        <Button disabled={!quotesLoaded || saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </>
  );
};
