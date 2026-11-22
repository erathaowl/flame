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

  const [dateTime, setDateTime] = useState(getDateTime());
  const [clock, setClock] = useState(new Date().toLocaleTimeString('en-GB', { hour12: false }));
  const [greeting, setGreeting] = useState(greeter());
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    axios.get<{ data: string | null }>('/api/quotes/random')
      .then((response) => setQuote(response.data.data))
      .catch(() => setQuote(null));

    const timer = window.setInterval(() => {
      setDateTime(getDateTime());
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setGreeting(greeter());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className={classes.Header}>
      {largeClock ? (
        !hideHeader && <p className={classes.SmallQuote}>{quote || greeting}</p>
      ) : (
        (!hideDate || showTime) && <p>{dateTime}</p>
      )}

      <Link to="/settings" className={classes.SettingsLink}>
        Go to Settings
      </Link>

      {!hideHeader && (
        <span className={classes.HeaderMain}>
          <h1>{largeClock ? clock : quote || greeting}</h1>
          <WeatherWidget />
        </span>
      )}
    </header>
  );
};
