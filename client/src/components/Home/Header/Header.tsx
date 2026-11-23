import { CSSProperties, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import classes from './Header.module.css';
import { WeatherWidget } from '../../Widgets/WeatherWidget/WeatherWidget';
import { getDateTime } from './functions/getDateTime';
import { greeter } from './functions/greeter';
import { getClockFontFamily, isLocalClockFont } from '../../../utility/clockFonts';

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

  const customFontFile = clockFont?.startsWith('local:') ? clockFont.slice(6) : '';

  useEffect(() => {
    if (!largeClock || !/^[^/\\]+\.(ttf|otf|woff2?)$/i.test(customFontFile)) return;

    const family = `Flame Local ${customFontFile}`;
    const fontUrl = `/clock-fonts/${encodeURIComponent(customFontFile)}`;
    const face = new FontFace(family, `url(${JSON.stringify(fontUrl)})`);
    let active = true;

    face.load()
      .then(() => { if (active) document.fonts.add(face); })
      .catch(() => {});

    return () => {
      active = false;
      document.fonts.delete(face);
    };
  }, [largeClock, customFontFile]);

  const clock = now.toLocaleTimeString('en-GB', { hour12: false });
  const greeting = quote || greeter();
  const fontFamily = getClockFontFamily(clockFont || 'default');
  const clockAppearance: CSSProperties = {
    fontFamily,
    fontSize: `min(${clockSizes[clockSize] || clockSizes.normal}, 12vw)`,
    fontWeight: clockStyle?.includes('bold') ? 700 : 400,
    fontStyle: clockStyle?.includes('italic') ? 'italic' : 'normal',
    fontSynthesis: isLocalClockFont(clockFont || '') ? 'none' : undefined,
    fontVariantNumeric: isLocalClockFont(clockFont || '') ? 'normal' : undefined,
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
