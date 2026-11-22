import { fireEvent, render, screen } from '@testing-library/react';
import { TableActions } from './TableActions';

jest.mock('../UI', () => ({
  Icon: () => null,
}));

test('visibility action calls the handler without starting other actions', () => {
  const changeVisibility = jest.fn();
  const edit = jest.fn();
  const remove = jest.fn();

  render(
    <table>
      <tbody>
        <tr>
          <TableActions
            entity={{ id: 7, name: 'Example', isPublic: true }}
            deleteHandler={remove}
            updateHandler={edit}
            changeVisibilty={changeVisibility}
            showPin={false}
          />
        </tr>
      </tbody>
    </table>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Hide Example' }));
  expect(changeVisibility).toHaveBeenCalledWith(7);
  expect(edit).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

test('edit and delete actions remain independently clickable', () => {
  const changeVisibility = jest.fn();
  const edit = jest.fn();
  const remove = jest.fn();

  render(
    <table>
      <tbody>
        <tr>
          <TableActions
            entity={{ id: 12, name: 'Bookmark', isPublic: false }}
            deleteHandler={remove}
            updateHandler={edit}
            changeVisibilty={changeVisibility}
            showPin={false}
          />
        </tr>
      </tbody>
    </table>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Edit Bookmark' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Bookmark' }));
  expect(edit).toHaveBeenCalledWith(12);
  expect(remove).toHaveBeenCalledWith(12, 'Bookmark');
  expect(changeVisibility).not.toHaveBeenCalled();
});
