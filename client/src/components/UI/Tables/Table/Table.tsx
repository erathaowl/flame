import classes from './Table.module.css';

interface Props {
  children: React.ReactNode;
  headers: string[];
  innerRef?: (element: HTMLElement | null) => void;
  droppableProps?: React.HTMLAttributes<HTMLTableSectionElement>;
  placeholder?: React.ReactNode;
}

export const Table = (props: Props): JSX.Element => {
  return (
    <div className={classes.TableContainer}>
      <table className={classes.Table}>
        <thead className={classes.TableHead}>
          <tr>
            {props.headers.map(
              (header: string, index: number): JSX.Element => (
                <th key={index}>{header}</th>
              )
            )}
          </tr>
        </thead>
        <tbody
          className={classes.TableBody}
          ref={props.innerRef}
          {...props.droppableProps}
        >
          {props.children}
          {props.placeholder}
        </tbody>
      </table>
    </div>
  );
};
