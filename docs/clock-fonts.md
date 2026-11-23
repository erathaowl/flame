# Large clock fonts

Under **Settings > Interface**, choose **Large clock / small quote** in
the Header section. The dedicated **Clock** section lets you choose its
font, size and style, using the same Save changes button as the quote
library.

Sizes: Small (2.5rem), Normal (3.5rem), Large (4.5rem), and Extra large
(5.5rem). The browser limits the rendered size to 12vw to keep the clock
usable on small screens. Font styles: Normal, Bold, Italic, and Bold italic.
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

These assets are not included in the repository, release packages, or
Docker images. The folder is part of the persistent data volume. Make sure
your font license also permits serving the fonts to browser visitors,
especially on publicly accessible dashboards.
