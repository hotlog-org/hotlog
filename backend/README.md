# Go Events API

This service owns the events backend logic and talks directly to Postgres.

## Run locally

From repo root:

```bash
yarn dev:api
```

Required environment variables:

- `GO_DATABASE_URL` (or `DATABASE_URL`)
- `GO_API_INTERNAL_TOKEN` (must match Next server value)
- `GO_API_ADDR` (optional, defaults to `:8080`)

## Endpoints

- `GET /healthz`
- `GET /events`
- `POST /events`
- `GET /events/{id}`
- `PATCH /events/{id}`
- `DELETE /events/{id}`
- `GET /events/schemas`
- `POST /events/schemas`
- `GET /events/schemas/{id}`
- `PATCH /events/schemas/{id}`
- `DELETE /events/schemas/{id}`

All `/events*` endpoints require:

- `X-Internal-Token`
- `X-User-Id`

These headers are provided by Next API proxy routes after Better Auth session check.
