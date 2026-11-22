// Typescript
import { ContentType } from '../Bookmarks';

// Utils
import { CategoryForm } from './CategoryForm';
import { BookmarksForm } from './BookmarksForm';
import { Fragment } from 'react';
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { bookmarkTemplate, categoryTemplate } from '../../../utility';

interface Props {
  modalHandler: () => void;
  contentType: ContentType;
  inUpdate?: boolean;
  categoryToUpdate?: Category | null;
}

export const Form = (props: Props): JSX.Element => {
  const { bookmarkInEdit } = useSelector(
    (state: State) => state.bookmarks
  );

  const { modalHandler, contentType, inUpdate, categoryToUpdate } = props;

  return (
    <Fragment>
      {!inUpdate ? (
        // form: add new
        <Fragment>
          {contentType === ContentType.category ? (
            <CategoryForm modalHandler={modalHandler} />
          ) : (
            <BookmarksForm modalHandler={modalHandler} />
          )}
        </Fragment>
      ) : (
        // form: update
        <Fragment>
          {contentType === ContentType.category ? (
            <CategoryForm
              modalHandler={modalHandler}
              category={categoryToUpdate || categoryTemplate}
            />
          ) : (
            <BookmarksForm
              modalHandler={modalHandler}
              bookmark={bookmarkInEdit || bookmarkTemplate}
            />
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
