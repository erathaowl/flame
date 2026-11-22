import { useSelector } from 'react-redux';
import { Redirect, Route, RouteProps } from 'react-router';
import { State } from '../../store/reducers';
import { Spinner } from '../UI';

export const ProtectedRoute = (props: RouteProps) => {
  const { isAuthenticated, checking } = useSelector((state: State) => state.auth);

  if (checking) return <Spinner />;
  return isAuthenticated ? <Route {...props} /> : <Redirect to="/settings/app" />;
};
