import { ReactNode } from 'react';
import classes from './Button.module.css';

interface Props {
  children: ReactNode;
  click?: any;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export const Button = (props: Props): JSX.Element => {
  const { children, click, type = 'submit', disabled = false } = props;

  return (
    <button type={type} className={classes.Button} onClick={click} disabled={disabled}>
      {children}
    </button>
  );
};
