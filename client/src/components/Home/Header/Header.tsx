import { CSSProperties, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import classes from './Header.module.css';
import { WeatherWidget } from '../../Widgets/WeatherWidget/WeatherWidget';
import { getDateTime } from './functions/getDateTime';
import { greeter } from './functions/greeter';
import { clockFonts } from '../../../utility/clockFonts';
import './clockFonts.css';

const clockSizes: Record<string, string> = {
  small: '2.5rem',
  normal: '3.5rem',
  large: '4.5rem',
  'extra-large': '5.5rem',
};

export const Header = (): JSX.Element => {
  const { hideHeader, hideDate, showTime, largeClock, clockFont, clockSize, clockStyle, quoteStyle } = useSelector(
    (state: State) => state.config.config
  );

  const [now, setNow] = useState(() => new Date());
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    axios.get<{ data: string | null }>('/api/quotes/random')
      .then((response) => setQuote(response.data.data))
      .catch(() => setQuote(null));

    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const clock = now.toLocaleTimeString('en-GB', { hour12: false });
  const greeting = quote || greeter();
  const fontFamily = clockFonts.find((font) => font.value === clockFont)?.family;
  const clockAppearance: CSSProperties = {
    fontFamily,
    fontSize: `min(${clockSizes[clockSize] || clockSizes.normal}, 12vw)`,
    fontWeight: clockStyle?.includes('bold') ? 700 : 400,
    fontStyle: clockStyle?.includes('italic') ? 'italic' : 'normal',
  };
  const quoteClass = quote ? [
    quoteStyle?.includes('italic') ? classes.Italic : '',
    quoteStyle?.includes('dimmed') ? classes.Dimmed : '',
  ].filter(Boolean).join(' ') : '';

  return (
    <header className={classes.Header}>
      {largeClock ? (
        !hideHeader && <p className={`${classes.SmallQuote} ${quoteClass}`}>{greeting}</p>
      ) : (
        (!hideDate || showTime) && <p>{getDateTime()}</p>
      )}

      <Link to="/settings" className={classes.SettingsLink}>
        Go to Settings
      </Link>

      {!hideHeader && (
        <span className={classes.HeaderMain}>
          <h1
            className={largeClock ? classes.Clock : quoteClass}
            style={largeClock ? clockAppearance : undefined}
          >
            {largeClock ? clock : greeting}
          </h1>
          <WeatherWidget />
        </span>
      )}
    </header>
  );
};
