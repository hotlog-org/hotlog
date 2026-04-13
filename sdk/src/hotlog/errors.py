"""Exception hierarchy. All SDK errors derive from `Error`."""

from __future__ import annotations


class Error(Exception):
    """Base class for all SDK exceptions."""


class AuthError(Error):
    """Raised on 401 / invalid or revoked API key."""


class ValidationError(Error):
    """
    Raised on 400 when the server rejects an event payload against its schema.

    `field_errors` mirrors the API response: a list of
    `{"field_key": str, "reason": str}` records.

    Note: distinct from `pydantic.ValidationError`, which fires at event
    construction time. This one fires when the server rejects the payload.
    """

    def __init__(
        self,
        message: str,
        field_errors: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.field_errors: list[dict[str, str]] = field_errors or []


class HTTPError(Error):
    """Raised on any other non-2xx response. Carries the status code."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.status_code = status_code
