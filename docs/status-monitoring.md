# Per-application status monitoring

Each application accepts a complete Gatus single-endpoint status URL, for
example:

```text
https://status.example.com/api/v1/endpoints/core_backend/statuses
```

The URL must be reachable from the **Flame backend**, including when running
inside Docker. Individual applications may point to different Gatus servers.
Leave the field empty to hide the indicator.

## Required Gatus response

A successful `GET` must respond with HTTP 200 and a JSON object in the
Gatus EndpointStatus format. Flame reads `results[].success` (boolean)
and `results[].timestamp` (ISO timestamp):

```json
{
  "name": "backend",
  "group": "core",
  "key": "core_backend",
  "results": [
    {
      "timestamp": "2026-11-22T19:00:00Z",
      "success": true,
      "status": 200,
      "duration": 12000000,
      "conditionResults": [
        { "condition": "[STATUS] == 200", "success": true }
      ]
    }
  ]
}
```

Additional Gatus fields are allowed; Flame currently ignores them.
See the [Gatus API documentation](https://github.com/TwiN/gatus#api)
and the [Gatus SDK data models](https://github.com/TwiN/gatus-sdk).

## Status interpretation

Flame sorts valid results by timestamp, newest first, and examines up to
three checks:

| Indicator | Meaning |
| --- | --- |
| Green | Latest check succeeds and the recent valid checks succeed |
| Yellow | Latest check succeeds after a recent failure, or status is unavailable, empty or malformed |
| Red | The latest valid check failed |

**Unknown and unreachable endpoints are yellow**, not red. This avoids
equating monitor connectivity failures with a confirmed service outage.
The dashboard refreshes every 60 seconds; backend responses are cached
by URL for 30 seconds. Multiple applications sharing a URL reuse its result.

The endpoint must use HTTP or HTTPS, contain no embedded credentials or
URL fragments, and follow the Gatus single-endpoint path
`/api/v1/endpoints/{group}_{endpoint}/statuses`.
Flame disallows redirects, limits responses to 256 KiB and applies a
five-second timeout.

## Access and privacy

Only authenticated users can change application URLs. Guests receive
status results only for applications marked public. The proxy runs from the
Flame server, so restrict network access appropriately: custom URLs can
cause server-side requests to reachable hosts. Do not configure untrusted
or sensitive internal destinations.

## Test coverage

Tests cover success, failure, recovery, empty history, invalid timestamps,
valid and invalid URL patterns, guest visibility and backend caching.
The HTTP suite uses a local fake Gatus server without external requests.
