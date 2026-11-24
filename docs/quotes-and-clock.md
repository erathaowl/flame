# Quote sources

Open **Settings → Quotes** to choose between two independent sources.

- **Local library** keeps the existing quotes (one per line). This remains the default after upgrading.
- **JSON endpoint** reads a new quote on homepage load. The local library is retained and used when the endpoint fails.

## JSON endpoint configuration

Enter an HTTP(S) URL and optionally select Bearer authentication or a query-string token. Query-string authentication requires the parameter name (for example `api_key`). Credentials are stored in the server's settings database and are never returned by the public configuration endpoint. If a credential is already stored, leave the password input blank to keep it.

The endpoint must respond with JSON. Supply paths for the quote text and the optional author. The application supports JSONPath property access, numeric indexes and wildcards, including:

| Response | Quote path | Author path |
| --- | --- | --- |
| `{"quote":"Hello","author":"Ada"}` | `$.quote` | `$.author` |
| `{"data":[{"text":"Hello","by":"Ada"}]}` | `$.data[*].text` | `$.data[*].by` |
| `[{"quote":"Hello"}]` | `$[0].quote` | leave blank |

For arrays, one matching quote is selected at random and the author at the corresponding position is used. An author is appended as `Quote text (Author)`. No author yields the quote text alone.

Use **Test endpoint** to fetch and preview a quote without saving. This test action requires authentication to Flame and shares the same parser used by the homepage. Requests have a five-second timeout, an HTTP(S)-only URL policy, redirects disabled and a response size limit.

The endpoint is fetched by Flame's server, so it must be reachable from the server/container, not only from the user's browser. Keep an endpoint key out of the URL if using the dedicated authentication field.

## API

- `GET /api/quotes/random` returns a random quote from the selected source; it falls back to the local library when the endpoint is unavailable.
- `GET /api/quotes` and `PUT /api/quotes` continue to manage the local library.
- `GET /api/quotes/source` reports whether an authentication secret is stored (authenticated).
- `PUT /api/quotes/source` stores the source choice and endpoint settings (authenticated).
- `POST /api/quotes/test` tests a draft endpoint configuration (authenticated).

The fields `source`, `url`, `authMode`, `queryName`, `textPath`, and `authorPath` are accepted by the source and test routes. The optional `authValue` replaces the stored secret when saving. Omitting it keeps the existing secret; passing an empty string clears the secret. The test route returns `quote`, `text`, `author` and `matchCount`.

## Clock element colors

Open **Settings → Clock** to set font, size, style and the colors of hours, minutes, seconds and each of the two separators.

Each color can use the current theme's primary, secondary (accent), or tertiary (a blend of primary and accent), with dimmed variants. These dynamic colors update when the theme changes. You can instead enter a fixed six-digit hexadecimal color.

All five elements default to the theme primary color to preserve the existing appearance.
