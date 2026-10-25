"""
Thin HTTP client for sending events to Hotlog.

Reuse a single `Client` across your app — it pools connections.
Pydantic validates each event at construction, so by the time `send()`
runs the payload is already known-good.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from types import TracebackType
from typing import Any

import httpx

from hotlog.errors import AuthError, Error, HTTPError, ValidationError
from hotlog.models import Event

DEFAULT_BASE_URL = "https://hotlog.org"
DEV_BASE_URL = "http://localhost:3000"
DEFAULT_TIMEOUT = 10.0


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _resolve_base_url(base_url: str | None, dev: bool | None) -> str:
    """Precedence: explicit base_url > explicit dev flag > env vars > prod default."""
    if base_url is not None:
        return base_url.rstrip("/")
    if dev is True:
        return DEV_BASE_URL
    env_url = os.environ.get("HOTLOG_API_URL")
    if env_url:
        return env_url.rstrip("/")
    if _truthy(os.environ.get("HOTLOG_DEV")):
        return DEV_BASE_URL
    return DEFAULT_BASE_URL


@dataclass(frozen=True)
class IngestResult:
    """The server's response after a successful ingest."""

    id: int
    created_at: datetime


class Client:
    """
    Examples:
        from hotlog import Client
        from my_app.hotlog_types import UserSignup

        client = Client(api_key="...")
        result = client.send(UserSignup(email="x@x.com"))

        # Or as a context manager so connections are released:
        with Client() as client:
            client.send(UserSignup(email="y@y.com"))
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        dev: bool | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        client: httpx.Client | None = None,
    ) -> None:
        """
        api_key:  Bearer key. Falls back to $HOTLOG_API_KEY.
        base_url: Override the API host. Wins over `dev` and env vars.
        dev:      Shortcut for `base_url="http://localhost:3000"`. Overrides
                  $HOTLOG_DEV when set; ignored when `base_url` is given.
        timeout:  HTTP timeout in seconds (default 10).
        client:   Bring-your-own httpx.Client (e.g. for a custom transport).
        """
        resolved_key = api_key or os.environ.get("HOTLOG_API_KEY")
        if not resolved_key:
            raise Error(
                "Missing API key. Pass api_key=... or set HOTLOG_API_KEY."
            )

        self._api_key = resolved_key
        self._base_url = _resolve_base_url(base_url, dev)
        self._owns_client = client is None
        self._client = client or httpx.Client(timeout=timeout)

    # --- Public API ---------------------------------------------------------

    def send(self, event: Event) -> IngestResult:
        """Ingest a single event. The class must come from `hotlog generate`."""
        schema_key = type(event)._hotlog_schema_key
        if not schema_key:
            raise Error(
                f"{type(event).__name__} has no _hotlog_schema_key — "
                "make sure it was emitted by `uv run hotlog generate`."
            )

        # by_alias preserves the original server-side field key when the
        # python name had to be munged. exclude_none keeps optional fields
        # off the wire when the user didn't set them.
        # mode='json' converts datetimes/UUIDs to JSON-safe primitives.
        value = event.model_dump(by_alias=True, exclude_none=True, mode="json")
        return self._post_event(schema_key, value)

    def send_raw(self, schema_key: str, value: dict[str, Any]) -> IngestResult:
        """
        Escape hatch — send an arbitrary payload by schema key.
        Prefer `send(event)` so pydantic + the type checker can catch
        shape errors before you hit the network.
        """
        return self._post_event(schema_key, value)

    # --- Lifecycle ----------------------------------------------------------

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> Client:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self.close()

    # --- Internals ----------------------------------------------------------

    def _post_event(self, schema_key: str, value: dict[str, Any]) -> IngestResult:
        url = f"{self._base_url}/api/events"
        try:
            response = self._client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={"schema_key": schema_key, "value": value},
            )
        except httpx.HTTPError as e:
            raise HTTPError(
                f"Network error contacting {url}: {e}", status_code=0
            ) from e

        return _parse_ingest_response(response)


def _parse_ingest_response(response: httpx.Response) -> IngestResult:
    try:
        body = response.json()
    except ValueError as e:
        raise HTTPError(
            f"Non-JSON response (HTTP {response.status_code}): {response.text[:200]}",
            status_code=response.status_code,
        ) from e

    if response.status_code == 201:
        data = body.get("data") or {}
        try:
            created_at = datetime.fromisoformat(data["createdAt"])
        except (KeyError, TypeError, ValueError) as e:
            raise HTTPError(
                f"Malformed success response: {body!r}",
                status_code=response.status_code,
            ) from e
        return IngestResult(id=int(data["id"]), created_at=created_at)

    err = (body.get("error") or {}) if isinstance(body, dict) else {}
    message = err.get("message") or f"HTTP {response.status_code}"

    if response.status_code == 401:
        raise AuthError(message)
    if response.status_code == 400 and "field_errors" in err:
        raise ValidationError(message, field_errors=err.get("field_errors"))
    raise HTTPError(message, status_code=response.status_code)
