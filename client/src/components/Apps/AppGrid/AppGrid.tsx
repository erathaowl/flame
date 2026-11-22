import { useEffect, useState } from 'react';
import axios from 'axios';
import classes from './AppGrid.module.css';
import { Link } from 'react-router-dom';
import { App } from '../../../interfaces/App';
import { AppCard } from '../AppCard/AppCard';
import { Message } from '../../UI';

type AppStatus = 'green' | 'yellow' | 'red';

interface Props {
  apps: App[];
  totalApps?: number;
  searching: boolean;
}

export const AppGrid = (props: Props): JSX.Element => {
  const [statuses, setStatuses] = useState<Record<number, AppStatus>>({});
  const monitored = props.apps
    .filter((app) => app.statusEndpoint)
    .map((app) => `${app.id}:${app.statusEndpoint}`)
    .join('|');

  useEffect(() => {
    if (!monitored) {
      setStatuses({});
      return;
    }

    let active = true;
    const refresh = async () => {
      try {
        const response = await axios.get<{ data: Record<number, AppStatus> }>('/api/status');
        if (active) setStatuses(response.data.data);
      } catch {
        if (active) setStatuses({});
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [monitored]);

  if (props.searching && !props.apps.length) {
    return <Message>No apps match your search criteria</Message>;
  }

  if (!props.apps.length) {
    return props.totalApps ? (
      <Message>
        There are no pinned applications. You can pin them from the{' '}
        <Link to="/applications">/applications</Link> menu
      </Message>
    ) : (
      <Message>
        You don't have any applications. You can add a new one from{' '}
        <Link to="/applications">/applications</Link> menu
      </Message>
    );
  }

  return (
    <div className={classes.AppGrid}>
      {props.apps.map((app) => (
        <AppCard
          key={app.id}
          app={app}
          status={app.statusEndpoint ? statuses[app.id] || 'yellow' : undefined}
        />
      ))}
    </div>
  );
};
