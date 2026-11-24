# Large clock fonts

Under **Settings > Clock**, choose **Large clock / small quote** as the
header layout. This page lets you configure font, size, style and each
clock element's color independently. The font selector discovers installed files automatically through
`GET /api/clock-fonts`, including custom TTF, OTF, WOFF, and WOFF2 files.
System fonts and bundled Nerd Fonts remain available at all times. Optional
LCD fonts appear only when their files exist in `data/clock-fonts`.

The large-clock header reserves extra vertical space below the quote and
the mobile Settings link, so fonts with unusual glyph metrics do not
overlap adjacent text. On mobile, zoom is disabled by the page viewport
configuration (this also restricts accessibility magnification).

Sizes: Auto (default), Small (2.5rem), Normal (3.5rem), Large (4.5rem),
and Extra large (5.5rem). Auto aligns the clock to the left and matches its
line height to the weather widget, reducing the font size when needed to
keep both items on the same row on narrow screens. If weather is unavailable,
Auto uses the Extra large height as a starting point. The other four sizes
retain their existing dimensions, with a 12vw maximum for small screens.
The weather widget is also visible on mobile when configured and when
weather data is available. Font styles: Normal, Bold, Italic, and Bold italic.
The default style is Bold, matching the previous large clock.

Common system fonts (Roboto, Arial, Helvetica,
Verdana, Georgia, Times New Roman, Courier New, Consolas) are available
without downloading assets.

## Bundled Nerd Fonts

The Docker build downloads **JetBrainsMono Nerd Font** and **3270 Nerd Font**
from the official [Nerd Fonts v3.5.1 release](https://github.com/ryanoasis/nerd-fonts/releases/tag/v3.5.1).
The smaller `.tar.xz` archives contain the same files as the requested ZIP
archives:

- [JetBrainsMono.zip](https://github.com/ryanoasis/nerd-fonts/releases/download/v3.5.1/JetBrainsMono.zip)
- [3270.zip](https://github.com/ryanoasis/nerd-fonts/releases/download/v3.5.1/3270.zip)

Only each font's regular monospaced face is embedded in the Docker image.
For a local source build, install the font assets before building:

```sh
sh scripts/install-open-clock-fonts.sh client/public/clock-fonts
npm run build --prefix client
```

The installer also extracts the font license from the source archive
when present. Consult the [Nerd Fonts license documentation](https://github.com/ryanoasis/nerd-fonts#license).

## Bundled LCD fonts

Flame bundles the following original, redistributable LCD-style font families:

- **[DSEG7 Classic](https://github.com/keshikan/DSEG/releases/tag/v0.46)**:
  a traditional seven-segment digital display with regular and bold faces.
  The image installs `DSEG7Classic-Regular.woff2` and
  `DSEG7Classic-Bold.woff2` from the official v0.46 release ZIP.
- **[Matrix Mono Screen](https://github.com/FriedOrange/MatrixSans/releases/tag/v1.811)**:
  a monospaced 5×7 grid of individually separated square dots, similar to
  classic character LCDs. The image includes `MatrixMonoScreen-Regular.ttf`
  from the official v1.811 release.

Both families are licensed under **SIL Open Font License 1.1**. Their
license files (`LICENSE-DSEG.txt` and `LICENSE-MatrixSans.txt`) are
included alongside the original font files in the built image. Both fonts
are always listed in Settings. Matrix Mono Screen preserves its original
Regular outline when Bold is selected, maintaining the gaps between pixels.

Doto was removed from the bundled font list in v2.6.4. Instances that
previously selected it automatically display Matrix Mono Screen; saving
Clock settings replaces the retired selection. This does not delete
user-installed fonts in the persistent `data/clock-fonts` directory.

## Optional LCD fonts

These fonts are **not distributed** with Flame because the authors set
personal-use or commercial licensing restrictions. Download them only in
accordance with each font's license, and install them into your own
persistent `data/clock-fonts` directory.

| Clock font | Source |
| --- | --- |
| LCD Dot | [DaFont](https://www.dafont.com/lcddot.font) |
| CF LCD 521 | [DaFont](https://www.dafont.com/cf-lcd-521.font) |
| Modern LCD-7 | [DaFont](https://www.dafont.com/modern-lcd-7.font) |
| Advanced Pixel LCD-7 | [DaFont](https://www.dafont.com/advanced-pixel-lcd-7.font) |
| LCD AT&T Phone Time/Date | [DaFont](https://www.dafont.com/lcd-at-t-phone-time-date.font) |

On your private, self-hosted instance you can use the optional download
helper **after reviewing the licenses**. It retrieves the five fonts
directly from the URLs supplied by their distributors:

```sh
sh scripts/install-personal-clock-fonts.sh /path/to/data/clock-fonts
```

The script requires `curl` and `unzip`. If a distributor restricts
automated downloads, download the ZIP files manually and extract the
font files using the filenames listed in
[`clock-fonts.css`](../client/public/clock-fonts.css).
No rebuild is necessary for the optional fonts because Flame serves
this folder at `/clock-fonts`.

If you install a custom font with another filename, the selector displays
its filename without the extension, followed by `(installed)`. If the
currently configured font disappears, the selector marks it as unavailable
until a different font is chosen. Refresh the settings page after adding
or removing files. For CF LCD 521, both `CF LCD 521.ttf` (installed by the
helper) and the original `CFLCD-Regular.ttf` filename are accepted.

Custom fonts and the optional LCD faces are rendered without synthetic
bold or italic effects to preserve their LCD segment shapes. Choose Normal
for the most faithful appearance.

These assets are not included in the repository, release packages, or
Docker images. The folder is part of the persistent data volume. Make sure
your font license also permits serving the fonts to browser visitors,
especially on publicly accessible dashboards.

## Browser cache and troubleshooting

Flame serves bundled Nerd and LCD fonts from the compiled public assets and
optional fonts from the persistent `data/clock-fonts` directory. The
`/clock-fonts/*` requests are revalidated on each load, as are the
`/clock-fonts.css` stylesheet and the main HTML page. Hashed JavaScript
and CSS bundles retain immutable caching.

If the clock still shows a fallback typeface, verify that the chosen font
exists by requesting `/clock-fonts/<font-file>.ttf` and checking for a
successful font response. A 404 means the font is missing, and optional LCD
fonts must be installed on the running instance. Browser developer tools
can also display which font is actually used to render the clock.
