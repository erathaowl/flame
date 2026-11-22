import { Icon } from '../UI';
import classes from './TableActions.module.css';

interface Entity {
  id: number;
  name: string;
  isPinned?: boolean;
  isPublic: boolean;
}

interface Props {
  entity: Entity;
  deleteHandler: (id: number, name: string) => void;
  updateHandler: (id: number) => void;
  pinHanlder?: (id: number) => void;
  changeVisibilty: (id: number) => void;
  showPin?: boolean;
}

export const TableActions = (props: Props): JSX.Element => {
  const {
    entity,
    deleteHandler,
    updateHandler,
    pinHanlder,
    changeVisibilty,
    showPin = true,
  } = props;

  return (
    <td>
      <div className={classes.TableActions}>
        <button
          type="button"
          className={classes.TableAction}
          title="Delete"
          aria-label={`Delete ${entity.name}`}
          onClick={() => deleteHandler(entity.id, entity.name)}
        >
          <Icon icon="mdiDelete" />
        </button>
        <button
          type="button"
          className={classes.TableAction}
          title="Edit"
          aria-label={`Edit ${entity.name}`}
          onClick={() => updateHandler(entity.id)}
        >
          <Icon icon="mdiPencil" />
        </button>
        {showPin && pinHanlder && (
          <button
            type="button"
            className={classes.TableAction}
            title={entity.isPinned ? 'Unpin' : 'Pin'}
            aria-label={`${entity.isPinned ? 'Unpin' : 'Pin'} ${entity.name}`}
            onClick={() => pinHanlder(entity.id)}
          >
            <Icon
              icon={entity.isPinned ? 'mdiPin' : 'mdiPinOff'}
              color={entity.isPinned ? undefined : 'var(--color-accent)'}
            />
          </button>
        )}
        <button
          type="button"
          className={classes.TableAction}
          title={entity.isPublic ? 'Hide' : 'Show'}
          aria-label={`${entity.isPublic ? 'Hide' : 'Show'} ${entity.name}`}
          onClick={() => changeVisibilty(entity.id)}
        >
          <Icon
            icon={entity.isPublic ? 'mdiEye' : 'mdiEyeOff'}
            color={entity.isPublic ? undefined : 'var(--color-accent)'}
          />
        </button>
      </div>
    </td>
  );
};
