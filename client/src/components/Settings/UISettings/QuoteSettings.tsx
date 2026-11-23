import { InputGroup, SettingsHeadline } from '../../UI';
import classes from './QuoteSettings.module.css';

interface Props {
  quotes: string;
  onChange: (value: string) => void;
  style: string;
  onStyleChange: (value: string) => void;
}

export const QuoteSettings = ({
  quotes, onChange, style, onStyleChange,
}: Props): JSX.Element => (
  <section className={classes.QuoteSettings}>
    <SettingsHeadline text="Quote library" />
    <InputGroup>
      <label htmlFor="quoteStyle">Quote style</label>
      <select
        id="quoteStyle"
        name="quoteStyle"
        value={style}
        onChange={(event) => onStyleChange(event.target.value)}
      >
        <option value="normal">Normal</option>
        <option value="italic">Italic</option>
        <option value="dimmed">Dimmed</option>
        <option value="italic-dimmed">Italic dimmed</option>
      </select>
    </InputGroup>
    <InputGroup>
      <label htmlFor="quotes">Quotes (one per line)</label>
      <textarea
        id="quotes"
        value={quotes}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
      />
      <span>Store any number of quotes. The homepage picks one randomly when opened. Empty library uses the greeting text.</span>
    </InputGroup>
  </section>
);
