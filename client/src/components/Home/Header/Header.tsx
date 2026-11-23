import { CSSProperties, useEffect, useRef, useState } from 'react';
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
  const [autoClockFontSize, setAutoClockFontSize] = useState(88);
  const clockRef = useRef<HTMLHeadingElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!largeClock || clockSize !== 'auto') return;

    const row = rowRef.current;
    const heading = clockRef.current;
    const weather = weatherRef.current;
    if (!row || !heading || !weather) return;

    const resize = () => {
      const height = weather.getBoundingClientRect().height || 88;
      const weatherWidth = weather.getBoundingClientRect().width;
      const availableWidth = Math.max(0, row.clientWidth - weatherWidth - 16);
      const style = window.getComputedStyle(heading);
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;

      context.font = `${style.fontStyle} ${style.fontWeight} ${height}px ${style.fontFamily}`;
      const textWidth = context.measureText('88:88:88').width;
      const size = Math.max(12, Math.floor(Math.min(height, height * availableWidth / Math.max(1, textWidth))));
      setAutoClockFontSize((current) => current === size ? current : size);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(row);
    observer.observe(weather);
    document.fonts.ready.then(resize);
    document.fonts.addEventListener('loadingdone', resize);
    resize();

    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', resize);
    };
  }, [largeClock, clockSize, clockFont, clockStyle]);

  const clock = now.toLocaleTimeString('en-GB', { hour12: false });
  const greeting = quote || greeter();
  const effectiveClockFont = clockFont === 'doto' ? 'matrix-mono-screen' : (clockFont || 'default');
  const fontFamily = getClockFontFamily(effectiveClockFont) || 'Roboto, sans-serif';
  const clockAppearance: CSSProperties = {
    fontFamily,
    fontSize: clockSize === 'auto' ? `${autoClockFontSize}px` : `min(${clockSizes[clockSize] || clockSizes.normal}, 12vw)`,
    fontWeight: clockStyle?.includes('bold') ? 700 : 400,
    fontStyle: clockStyle?.includes('italic') ? 'italic' : 'normal',
    fontSynthesis: isLocalClockFont(effectiveClockFont) ? 'none' : undefined,
    fontVariantNumeric: isLocalClockFont(effectiveClockFont) ? 'normal' : undefined,
  };
  const quoteClass = quote ? [
    quoteStyle?.includes('italic') ? classes.Italic : '',
    quoteStyle?.includes('dimmed') ? classes.Dimmed : '',
  ].filter(Boolean).join(' ') : '';

  return (
    <header className={`${classes.Header} ${largeClock ? classes.LargeClockHeader : ''}`}>
      {largeClock ? (
        !hideHeader && <p className={`${classes.SmallQuote} ${quoteClass}`}>{greeting}</p>
      ) : (
        (!hideDate || showTime) && <p>{getDateTime()}</p>
      )}

      <Link to="/settings" className={classes.SettingsLink}>
        Go to Settings
      </Link>

      {!hideHeader && (
        <div ref={rowRef} className={`${classes.HeaderMain} ${largeClock && clockSize === 'auto' ? classes.HeaderMainAuto : ''}`}>
          <h1
            ref={clockRef}
            className={largeClock ? `${classes.Clock} ${clockSize === 'auto' ? classes.ClockAuto : ''}` : quoteClass}
            style={largeClock ? clockAppearance : undefined}
          >
            {largeClock ? clock : greeting}
          </h1>
          <div className={classes.WeatherSlot} ref={weatherRef} data-testid="weather-slot">
            <WeatherWidget />
          </div>
        </div>
      )}
    </header>
  );
};
