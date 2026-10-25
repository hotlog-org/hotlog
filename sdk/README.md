# Hotlog Python SDK

Type-safe Python client for the [Hotlog](https://hotlog.org) event platform.

- **Strict pydantic models** for every event in your project — typos and bad
  types fail loudly at construction, never silently in production.
- **Codegen CLI** (`uv run hotlog generate`) reads the schemas you defined in
  the dashboard and writes a `hotlog_types.py` you import.
- **Single dependency surface**: `httpx` for transport, `pydantic` for types.

## Install

```bash
uv add hotlog          # in the consumer project
uv sync                # inside this repo for development
```

## Generate types

```bash
export HOTLOG_API_KEY=<your-key>
uv run hotlog generate --out my_app/hotlog_types.py
```

This calls `GET /api/sdk/schemas`, reads every active schema, and writes one
pydantic class per schema:

```python
# my_app/hotlog_types.py (auto-generated)

class UserSignup(Event):
    """User Signup (schema_key: user_signup)"""

    _hotlog_schema_key: ClassVar[str] = "user_signup"

    email: str
    plan: Literal["free", "pro"] | None = None
    signed_up_at: datetime | None = None
```

Re-run after editing schemas in the dashboard.

## Send events

Two equivalent styles — pick whichever reads better at the call site:

```python
from hotlog import Client
from my_app.hotlog_types import UserSignup

with Client() as client:                        # reads HOTLOG_API_KEY from env

    # 1. Type-led — class first, payload as kwargs (recommended)
    result = UserSignup.send(client, email="alice@example.com", plan="pro")

    # 2. Type-led — pre-built instance
    msg = UserSignup(email="alice@example.com", plan="pro")
    result = UserSignup.send(client, msg)

    # 3. Client-led — pass any built event
    result = client.send(UserSignup(email="alice@example.com"))

    print(result.id, result.created_at)
```

All three paths run the same pydantic validation, so bad input fails before
the network call:

```python
UserSignup.send(client, email=42)             # ValidationError: email must be a str
UserSignup.send(client, plan="enterprise")    # ValidationError: plan must be free|pro
UserSignup.send(client, typo="x")             # ValidationError: extra fields are forbidden
```

## Errors

The top-level package only exports `Client`, `Event`, and `IngestResult` so
imports stay tidy. Exception classes live in `hotlog.errors`:

```python
from hotlog import Client
from hotlog.errors import AuthError, ValidationError

try:
    client.send(...)
except ValidationError as e:
    print(e.field_errors)        # [{"field_key": ..., "reason": ...}, ...]
except AuthError:
    refresh_key()
```

| Exception | When |
|-----------|------|
| `hotlog.errors.AuthError` | 401 — missing, invalid, or revoked API key |
| `hotlog.errors.ValidationError` | 400 — server-side schema validation failed (`.field_errors`) |
| `hotlog.errors.HTTPError` | any other non-2xx, plus network errors |
| `hotlog.errors.Error` | base class for all of the above |

## Configuration

| Argument | Env var | Default |
|----------|---------|---------|
| `api_key` | `HOTLOG_API_KEY` | — (required) |
| `base_url` | `HOTLOG_API_URL` | `https://hotlog.org` |
| `dev=True` | `HOTLOG_DEV=1` | off — when on, targets `http://localhost:3000` |
| `timeout` | — | `10.0` seconds |

Precedence (most specific wins): `base_url` arg → `dev=True` arg → `HOTLOG_API_URL` env → `HOTLOG_DEV` env → production default.

```python
Client(api_key="...", dev=True)        # → http://localhost:3000
# or, no kwargs needed:
#   HOTLOG_DEV=1 python my_script.py
```

```bash
uv run hotlog generate --dev                  # hits http://localhost:3000
HOTLOG_DEV=1 uv run hotlog generate           # same thing
```

## Development

```bash
uv sync
uv run pytest
uv run ruff check
uv run mypy src
uv build
```
