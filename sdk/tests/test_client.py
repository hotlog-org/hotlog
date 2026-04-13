"""Tests for the HTTP client — serialization, response parsing, error mapping."""

from __future__ import annotations

from datetime import datetime
from typing import ClassVar

import httpx
import pytest
from pydantic import Field, ValidationError as PydanticValidationError

from hotlog import Client, Event, IngestResult
from hotlog.errors import AuthError, Error, HTTPError, ValidationError


# --- Test fixtures: hand-crafted events ------------------------------------

class UserSignup(Event):
    """Stand-in for a generated event."""

    _hotlog_schema_key: ClassVar[str] = "user_signup"

    email: str
    signed_up_at: datetime | None = None
    weird_field: str | None = Field(default=None, alias="weird-field")


class NoSchemaKeyEvent(Event):
    """Bug case: an Event subclass without a schema key."""

    email: str


# --- Helpers ---------------------------------------------------------------

def _client_with_handler(handler: httpx.MockTransport) -> Client:
    return Client(
        api_key="test-key",
        base_url="https://example.test",
        client=httpx.Client(transport=handler),
    )


# --- Construction ----------------------------------------------------------

def test_client_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HOTLOG_API_KEY", raising=False)
    with pytest.raises(Error, match="Missing API key"):
        Client()


def test_client_uses_env_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HOTLOG_API_KEY", "from-env")
    client = Client()
    assert client._api_key == "from-env"  # noqa: SLF001 — testing internals


def test_client_strips_trailing_slash_from_base_url() -> None:
    client = Client(api_key="x", base_url="https://example.test/")
    assert client._base_url == "https://example.test"  # noqa: SLF001


def test_client_defaults_to_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HOTLOG_API_URL", raising=False)
    monkeypatch.delenv("HOTLOG_DEV", raising=False)
    client = Client(api_key="x")
    assert client._base_url == "https://hotlog.org"  # noqa: SLF001


def test_client_dev_flag_targets_localhost(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HOTLOG_API_URL", raising=False)
    client = Client(api_key="x", dev=True)
    assert client._base_url == "http://localhost:3000"  # noqa: SLF001


def test_client_dev_env_var_targets_localhost(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HOTLOG_API_URL", raising=False)
    monkeypatch.setenv("HOTLOG_DEV", "1")
    client = Client(api_key="x")
    assert client._base_url == "http://localhost:3000"  # noqa: SLF001


def test_client_explicit_base_url_wins_over_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HOTLOG_DEV", "1")
    client = Client(api_key="x", base_url="https://staging.example.test", dev=True)
    assert client._base_url == "https://staging.example.test"  # noqa: SLF001


def test_client_api_url_env_wins_over_dev_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HOTLOG_API_URL", "https://custom.example.test")
    monkeypatch.setenv("HOTLOG_DEV", "1")
    client = Client(api_key="x")
    assert client._base_url == "https://custom.example.test"  # noqa: SLF001


# --- Send ------------------------------------------------------------------

def test_send_serializes_event_and_posts() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("Authorization")
        seen["body"] = request.content.decode()
        return httpx.Response(
            201,
            json={"data": {"id": 42, "createdAt": "2026-04-14T10:30:00+00:00"}},
        )

    client = _client_with_handler(httpx.MockTransport(handler))

    event = UserSignup(email="x@x.com", signed_up_at=datetime(2026, 4, 14, 10, 0, 0))
    result = client.send(event)

    assert isinstance(result, IngestResult)
    assert result.id == 42
    assert seen["url"] == "https://example.test/api/events"
    assert seen["auth"] == "Bearer test-key"
    assert '"schema_key":"user_signup"' in str(seen["body"])
    assert "2026-04-14T10:00:00" in str(seen["body"])
    assert "weird-field" not in str(seen["body"])


def test_send_uses_field_alias_on_wire() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.content.decode()
        return httpx.Response(201, json={"data": {"id": 1, "createdAt": "2026-04-14T10:00:00"}})

    client = _client_with_handler(httpx.MockTransport(handler))

    event = UserSignup(email="x@x.com", **{"weird-field": "value"})  # type: ignore[arg-type]
    client.send(event)

    assert '"weird-field":"value"' in seen["body"]
    assert "weird_field" not in seen["body"]


def test_send_rejects_event_without_schema_key() -> None:
    client = _client_with_handler(httpx.MockTransport(lambda r: httpx.Response(201, json={})))
    with pytest.raises(Error, match="_hotlog_schema_key"):
        client.send(NoSchemaKeyEvent(email="x@x.com"))


def test_send_raw_skips_pydantic_validation() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.content.decode()
        return httpx.Response(201, json={"data": {"id": 1, "createdAt": "2026-04-14T10:00:00"}})

    client = _client_with_handler(httpx.MockTransport(handler))
    client.send_raw("custom_schema", {"foo": "bar"})

    assert '"schema_key":"custom_schema"' in seen["body"]
    assert '"foo":"bar"' in seen["body"]


# --- Event.send classmethod (alternate DX) ---------------------------------

def test_event_send_with_instance() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.content.decode()
        return httpx.Response(201, json={"data": {"id": 7, "createdAt": "2026-04-14T10:00:00"}})

    client = _client_with_handler(httpx.MockTransport(handler))

    msg = UserSignup(email="x@x.com")
    result = UserSignup.send(client, msg)

    assert result.id == 7
    assert '"schema_key":"user_signup"' in seen["body"]
    assert '"email":"x@x.com"' in seen["body"]


def test_event_send_with_kwargs() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = request.content.decode()
        return httpx.Response(201, json={"data": {"id": 8, "createdAt": "2026-04-14T10:00:00"}})

    client = _client_with_handler(httpx.MockTransport(handler))

    result = UserSignup.send(client, email="x@x.com")

    assert result.id == 8
    assert '"email":"x@x.com"' in seen["body"]


def test_event_send_kwargs_validate_via_pydantic() -> None:
    client = _client_with_handler(
        httpx.MockTransport(
            lambda r: httpx.Response(201, json={"data": {"id": 1, "createdAt": "2026-04-14T10:00:00"}})
        )
    )

    with pytest.raises(PydanticValidationError):
        UserSignup.send(client, email=123)  # wrong type

    with pytest.raises(PydanticValidationError):
        UserSignup.send(client, typo="oops")  # extra field


def test_event_send_rejects_wrong_subclass() -> None:
    """User.send(client, page_view) must not accept a non-User instance."""
    client = _client_with_handler(
        httpx.MockTransport(
            lambda r: httpx.Response(201, json={"data": {"id": 1, "createdAt": "2026-04-14T10:00:00"}})
        )
    )

    other = NoSchemaKeyEvent(email="x@x.com")
    with pytest.raises(TypeError, match="expected a UserSignup"):
        UserSignup.send(client, other)  # type: ignore[arg-type]


def test_event_send_rejects_mixing_instance_and_kwargs() -> None:
    client = _client_with_handler(
        httpx.MockTransport(
            lambda r: httpx.Response(201, json={"data": {"id": 1, "createdAt": "2026-04-14T10:00:00"}})
        )
    )

    msg = UserSignup(email="x@x.com")
    with pytest.raises(TypeError, match="both a positional instance and keyword"):
        UserSignup.send(client, msg, plan="pro")  # type: ignore[call-arg]


# --- Pydantic validation happens at construction time, not send ------------

def test_pydantic_rejects_wrong_type_at_construction() -> None:
    with pytest.raises(PydanticValidationError):
        UserSignup(email=123)  # type: ignore[arg-type]


def test_pydantic_rejects_extra_fields() -> None:
    with pytest.raises(PydanticValidationError):
        UserSignup(email="x@x.com", typo="oops")  # type: ignore[call-arg]


# --- Error mapping ---------------------------------------------------------

def test_send_raises_auth_error_on_401() -> None:
    handler = httpx.MockTransport(
        lambda r: httpx.Response(401, json={"error": {"message": "Invalid API key"}})
    )
    client = _client_with_handler(handler)
    with pytest.raises(AuthError, match="Invalid API key"):
        client.send(UserSignup(email="x@x.com"))


def test_send_raises_validation_error_on_400_with_field_errors() -> None:
    handler = httpx.MockTransport(
        lambda r: httpx.Response(
            400,
            json={
                "error": {
                    "message": "Event value failed schema validation",
                    "field_errors": [{"field_key": "email", "reason": "must be a string"}],
                }
            },
        )
    )
    client = _client_with_handler(handler)
    with pytest.raises(ValidationError) as exc_info:
        client.send(UserSignup(email="x@x.com"))
    assert exc_info.value.field_errors == [{"field_key": "email", "reason": "must be a string"}]


def test_send_raises_http_error_on_other_status() -> None:
    handler = httpx.MockTransport(
        lambda r: httpx.Response(500, json={"error": {"message": "boom"}})
    )
    client = _client_with_handler(handler)
    with pytest.raises(HTTPError) as exc_info:
        client.send(UserSignup(email="x@x.com"))
    assert exc_info.value.status_code == 500


def test_send_raises_http_error_on_non_json_response() -> None:
    handler = httpx.MockTransport(lambda r: httpx.Response(502, text="Bad Gateway"))
    client = _client_with_handler(handler)
    with pytest.raises(HTTPError, match="Non-JSON"):
        client.send(UserSignup(email="x@x.com"))


def test_context_manager_closes_owned_client() -> None:
    closed = {"flag": False}

    class TrackingTransport(httpx.MockTransport):
        def __init__(self) -> None:
            super().__init__(lambda r: httpx.Response(201, json={"data": {"id": 1, "createdAt": "2026-04-14T10:00:00"}}))

    inner = httpx.Client(transport=TrackingTransport())
    original_close = inner.close

    def tracking_close() -> None:
        closed["flag"] = True
        original_close()

    inner.close = tracking_close  # type: ignore[method-assign]

    with Client(api_key="x", base_url="https://example.test", client=inner):
        pass
    # User-supplied client → not closed by Client
    assert closed["flag"] is False
