import { iconParser } from './iconParser';

describe('iconParser', () => {
  test.each([
    ['server', 'mdiServer'],
    ['alert-box-outline', 'mdiAlertBoxOutline'],
    ['  server  ', 'mdiServer'],
    ['-server-', 'mdiServer'],
    ['alert--box-outline', 'mdiAlertBoxOutline'],
    ['', 'mdiCancel'],
    ['   ', 'mdiCancel'],
    ['---', 'mdiCancel'],
    [null, 'mdiCancel'],
    [undefined, 'mdiCancel'],
  ])('parses %p as %s without throwing', (input, expected) => {
    expect(iconParser(input)).toBe(expected);
  });
});
