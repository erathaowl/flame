import { InputGroup, SettingsHeadline } from '../../UI';
import classes from './QuoteSettings.module.css';

interface Props {
  quotes: string;
  onChange: (value: string) => void;
}

export const QuoteSettings = ({ quotes, onChange }: Props): JSX.Element => (
  <section className={classes.QuoteSettings}>
    <SettingsHeadline text="Quote library" />
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
