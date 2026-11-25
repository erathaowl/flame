/**
 * Convert a dash-separated MDI icon name to its @mdi/js export name.
 * Use the default icon when the name is missing or empty.
 */
export const iconParser = (mdiName?: string | null): string => {
  if (typeof mdiName !== 'string') return 'mdiCancel';

  const parsedName = mdiName.trim()
    .split('-')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');

  return parsedName ? `mdi${parsedName}` : 'mdiCancel';
};
