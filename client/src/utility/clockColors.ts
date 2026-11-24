export const clockColorOptions = [
  { value: 'primary', label: 'Theme primary' },
  { value: 'secondary', label: 'Theme secondary' },
  { value: 'tertiary', label: 'Theme tertiary' },
  { value: 'primary-dimmed', label: 'Primary dimmed' },
  { value: 'secondary-dimmed', label: 'Secondary dimmed' },
  { value: 'tertiary-dimmed', label: 'Tertiary dimmed' },
];

export const clockColor = (value: string = 'primary'): string => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const colors: Record<string, string> = {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-accent)',
    tertiary: 'color-mix(in srgb, var(--color-primary) 60%, var(--color-accent))',
  };
  const dimmed = value.endsWith('-dimmed');
  const base = colors[dimmed ? value.slice(0, -7) : value] || colors.primary;
  return dimmed ? `color-mix(in srgb, ${base} 55%, var(--color-background))` : base;
};
