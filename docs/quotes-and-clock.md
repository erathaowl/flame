# Quote sources

Open **Settings → Quotes** to choose between two independent sources.

- **Local library** keeps the existing quotes (one per line). This remains the default after upgrading.
- **JSON endpoint** reads a new quote on homepage load. The local library is retained and used when the endpoint fails.

## JSON endpoint configuration

Enter an HTTP(S) URL. The existing None, Bearer token and query-string authentication options remain available. Query-string authentication requires a parameter name (for example `api_key`).

Under **Custom HTTP headers**, use **Add header** to enter as many name/value pairs as needed. For example:

| Header name | Header value |
| --- | --- |
| `Authorization` | `Basic <base64-credentials>` |
| `X-API-Key` | `your-api-key` |
| `X-Tenant-ID` | `example-tenant` |
| `Accept` | `application/json` |

Select **None** for authentication if using only custom headers. A custom Authorization header overrides the Bearer option; headers can also be combined with query-string authentication. Existing Bearer and query-string configurations continue to work.

All header values are treated as credentials, stored in the server's SQLite settings database and masked in the UI. Only saved names are returned to authenticated clients; values are excluded from public configuration and YAML backups. They are not encrypted at rest, so protect the persistent data volume. Leave a saved value untouched to retain it, enter a replacement to update it, or remove its row and save to delete it. Use HTTPS for endpoints carrying credentials.

Header names are case-insensitive and must be valid HTTP tokens. Duplicate names and reserved transport headers (such as Host, Connection and Content-Length) are rejected, as are invalid control characters and internal Axios keys. Up to 32 headers are supported, with names up to 128 characters, values up to 2048 characters, and a total limit of 8192 characters.

The endpoint must respond with JSON. Supply paths for the quote text and the optional author. The application supports JSONPath property access, numeric indexes and wildcards, including:

| Response | Quote path | Author path |
| --- | --- | --- |
| `{"quote":"Hello","author":"Ada"}` | `$.quote` | `$.author` |
| `{"data":[{"text":"Hello","by":"Ada"}]}` | `$.data[*].text` | `$.data[*].by` |
| `[{"quote":"Hello"}]` | `$[0].quote` | leave blank |

For arrays, one matching quote is selected at random and the author at the corresponding position is used. An author is appended as `Quote text (Author)`. No author yields the quote text alone.

Use **Test endpoint** to fetch and preview a quote without saving. This test action requires authentication to Flame and shares the same parser used by the homepage. Requests have a five-second timeout, an HTTP(S)-only URL policy, redirects disabled and a response size limit.

The endpoint is fetched by Flame's server, so it must be reachable from the server/container, not only from the user's browser. Keep an endpoint key out of the URL if using the dedicated authentication field.

## Minimum refresh interval

Choose **None** (default) to request a new quote on every homepage load, or select
1, 5, 10, 15 or 30 minutes, or 1, 2, 4, 6, 12 or 24 hours. The server keeps
the last extracted quote in memory and shares it across all clients.
Concurrent requests share one outbound fetch. When the interval expires, the
next homepage request fetches a new quote; there is no background polling.

If a refresh fails, the last successful quote is retained and another attempt
is made only after the interval. If there is no cached quote, the local library
is used. Changing endpoint settings (including headers or the interval) or
restarting Flame invalidates the in-memory cache. **Test endpoint** always
makes a real request without replacing the homepage cache.

## API

- `GET /api/quotes/random` returns a random quote from the selected source; it uses the configured cache interval and falls back to the last successful quote or the local library when the endpoint is unavailable.
- `GET /api/quotes` and `PUT /api/quotes` continue to manage the local library.
- `GET /api/quotes/source` reports `hasSecret` and `headerNames` (authenticated); it never returns credential values.
- `PUT /api/quotes/source` stores the source choice and endpoint settings (authenticated).
- `POST /api/quotes/test` tests a draft endpoint configuration (authenticated).

The fields `source`, `url`, `authMode`, `queryName`, `textPath`, and `authorPath` are accepted by the source and test routes. The optional `authValue` replaces the legacy stored secret when saving. Omitting it keeps that secret; passing an empty string clears it.

The optional numeric `refreshInterval` is in seconds: `0`, `60`, `300`, `600`, `900`, `1800`, `3600`, `7200`, `14400`, `21600`, `43200`, or `86400`. Omission preserves the saved interval; zero disables caching.

The optional `headers` array contains objects with `name` and `value` properties. For example:

```json
{
  "source": "endpoint",
  "url": "https://example.org/api/quotes",
  "authMode": "none",
  "queryName": "api_key",
  "textPath": "$.quote",
  "authorPath": "$.author",
  "refreshInterval": 3600,
  "headers": [
    {"name": "X-API-Key", "value": "your-api-key"},
    {"name": "X-Tenant-ID", "value": "example-tenant"}
  ]
}
```

Omitting `headers` preserves the saved list. Providing an array replaces it when saving; omit an individual `value` to reuse the stored value for that name (case-insensitive). An empty array clears all headers. The test route uses the same resolution rules but does not save changes. It returns `quote`, `text`, `author` and `matchCount`.

## Clock element colors

Open **Settings → Clock** to set font, size, style and the colors of hours, minutes, seconds and each of the two separators.

Each color can use the current theme's primary, secondary (accent), or tertiary (a blend of primary and accent), with dimmed variants. These dynamic colors update when the theme changes. You can instead enter a fixed six-digit hexadecimal color.

All five elements default to the theme primary color to preserve the existing appearance.
