export interface ClockFont {
  value: string;
  label: string;
  family: string;
}

export const clockFonts: ClockFont[] = [
  { value: 'default', label: 'Roboto (default)', family: 'Roboto, sans-serif' },
  { value: 'arial', label: 'Arial', family: 'Arial, sans-serif' },
  { value: 'helvetica', label: 'Helvetica', family: 'Helvetica, Arial, sans-serif' },
  { value: 'verdana', label: 'Verdana', family: 'Verdana, sans-serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
  { value: 'times', label: 'Times New Roman', family: '"Times New Roman", serif' },
  { value: 'courier', label: 'Courier New', family: '"Courier New", monospace' },
  { value: 'consolas', label: 'Consolas', family: 'Consolas, monospace' },
  { value: 'jetbrains-mono', label: 'JetBrainsMono Nerd Font', family: '"JetBrainsMono Nerd Font", monospace' },
  { value: '3270', label: '3270 Nerd Font', family: '"3270 Nerd Font", monospace' },
  { value: 'dseg7', label: 'DSEG7 Classic (7-segment LCD)', family: '"DSEG7 Classic", monospace' },
  { value: 'doto', label: 'Doto (dot-matrix LCD)', family: '"Doto", monospace' },
  { value: 'lcddot', label: 'LCD Dot', family: '"LCD Dot", monospace' },
  { value: 'cf-lcd-521', label: 'CF LCD 521', family: '"CF LCD 521", monospace' },
  { value: 'modern-lcd-7', label: 'Modern LCD-7', family: '"Modern LCD-7", monospace' },
  { value: 'advanced-pixel-lcd-7', label: 'Advanced Pixel LCD-7', family: '"Advanced Pixel LCD-7", monospace' },
  { value: 'lcd-att', label: 'LCD AT&T Phone Time/Date', family: '"LCD AT&T Phone Time/Date", monospace' },
];

const optionalFontFiles: Record<string, string[]> = {
  lcddot: ['lcddot_tr.ttf'],
  'cf-lcd-521': ['CF LCD 521.ttf', 'CFLCD-Regular.ttf'],
  'modern-lcd-7': ['modern_lcd-7.ttf'],
  'advanced-pixel-lcd-7': ['advanced_pixel_lcd-7.ttf'],
  'lcd-att': ['LCDAT&TPhoneTimeDate.ttf'],
};

const validFontFile = (file: string): boolean =>
  /^[^/\\]+\.(ttf|otf|woff2?)$/i.test(file);

export const getClockFontFamily = (value: string): string | undefined => {
  if (value.startsWith('local:')) {
    const file = value.slice(6);
    return validFontFile(file) ? `${JSON.stringify(`Flame Local ${file}`)}, monospace` : undefined;
  }
  return clockFonts.find((font) => font.value === value)?.family;
};

export const isLocalClockFont = (value: string): boolean =>
  value.startsWith('local:') || Object.prototype.hasOwnProperty.call(optionalFontFiles, value);

export const availableClockFonts = (installed: string[]): ClockFont[] => {
  const installedNames = new Set(installed.map((file) => file.toLowerCase()));
  const knownNames = new Set(
    Object.values(optionalFontFiles).flat().map((file) => file.toLowerCase())
  );

  const builtIn = clockFonts.filter((font) => !optionalFontFiles[font.value]);
  const optional = clockFonts.filter((font) =>
    optionalFontFiles[font.value]?.some((file) => installedNames.has(file.toLowerCase()))
  );
  const custom = installed
    .filter((file) => validFontFile(file) && !knownNames.has(file.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      value: `local:${file}`,
      label: `${file.replace(/\.(ttf|otf|woff2?)$/i, '')} (installed)`,
      family: getClockFontFamily(`local:${file}`) || 'monospace',
    }));

  return [...builtIn, ...optional, ...custom];
};
