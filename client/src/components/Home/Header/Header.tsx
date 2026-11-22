import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import classes from './Header.module.css';
import { WeatherWidget } from '../../Widgets/WeatherWidget/WeatherWidget';
import { getDateTime } from './functions/getDateTime';
import { greeter } from './functions/greeter';

export const Header = (): JSX.Element => {
  const { hideHeader, hideDate, showTime, largeClock } = useSelector(
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

  return (
    <header className={classes.Header}>
      {largeClock ? (
        !hideHeader && <p className={classes.SmallQuote}>{greeting}</p>
      ) : (
        (!hideDate || showTime) && <p>{getDateTime()}</p>
      )}

      <Link to="/settings" className={classes.SettingsLink}>
        Go to Settings
      </Link>

      {!hideHeader && (
        <span className={classes.HeaderMain}>
          <h1>{largeClock ? clock : greeting}</h1>
          <WeatherWidget />
        </span>
      )}
    </header>
  );
};
