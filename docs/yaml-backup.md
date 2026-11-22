# YAML backup and restore

Flame exports the following records from **Settings > Backup**:

- Applications, including names, URLs, icons, descriptions, visibility,
  pinning, manual order, and per-application Gatus status URLs.
- Bookmark categories, their visibility, pinning and order.
- Bookmarks nested under their categories, including visibility and order.
- The selected sorting strategy.

## File format

The schema version is currently `1`. Example:

```yaml
version: 1
sorting: orderId
applications:
  - name: Grafana
    url: https://grafana.example.com
    icon: chart-line
    description: Metrics
    statusEndpoint: https://status.example.com/api/v1/endpoints/core_grafana/statuses
    isPublic: false
    isPinned: true
    orderId: 1
categories:
  - name: Development
    isPublic: true
    isPinned: true
    orderId: 1
    bookmarks:
      - name: GitHub
        url: https://github.com
        icon: github
        isPublic: true
        orderId: 1
```

`sorting` accepts `name`, `createdAt` or `orderId`.
The `orderId` fields are preserved regardless of the active display sort.
The `isPublic` and `isPinned` fields must be YAML booleans (`true` or
`false`). IDs are intentionally excluded and recreated during import.
Each entry requires a nonempty `name` and `url`; icon, description
and Gatus status URL are optional. Validated text fields are at most
255 characters.

## Import behavior

1. Download and retain a backup before replacing records.
2. Select a YAML file in **Settings > Backup**.
3. Confirm replacement of the existing applications, categories, and bookmarks.
4. Flame validates the complete YAML before any database modifications.
5. Flame replaces the data and writes the sorting setting in the **same
   SQLite transaction**. Database errors roll back all changes.

The import replaces the relevant collections rather than merging them.
It retains unrelated SQLite settings and the quote library.

**Scope limitations:** The YAML includes image/icon *references*, not uploaded
icon files. Preserve the full `/app/data` volume to keep uploaded icons,
custom themes, search queries, quotations and other persistent state.
The YAML file alone is not a complete disaster-recovery backup.

## HTTP endpoints

Both endpoints require an authenticated `Authorization-Flame: Bearer <token>`
header:

| Method | Route | Result |
| --- | --- | --- |
| GET | `/api/backup` | YAML document download |
| POST | `/api/backup` | Validates and replaces records |

For POST, supply `Content-Type: application/x-yaml`, `text/yaml` or
`text/plain`. The request body limit is 2 MiB. A valid import returns counts
of applications, categories and bookmarks; invalid documents return HTTP 400.
Unauthenticated requests receive HTTP 401.

## Automated verification

The SQLite/HTTP end-to-end suite checks both successful import and a
simulated database error after replacement has started. After the simulated
error, the previous applications, categories and sorting setting remain
unchanged. See [testing](testing.md).
