"""
Base class every generated event extends.

Strict pydantic config so type mismatches and unknown fields raise loudly
at construction time, not at the network boundary.

Two equivalent ways to send an event:

    User.send(client, User(email="x@x.com"))   # pre-built instance
    User.send(client, email="x@x.com")          # construct + send in one call

    # The classic form also works:
    client.send(User(email="x@x.com"))
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, ClassVar, Self

from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    from hotlog.client import Client, IngestResult


class Event(BaseModel):
    """
    Subclass written by the codegen — never instantiate directly.

    Subclasses set `_hotlog_schema_key` (a `ClassVar[str]`) so the client
    knows which schema to send each event to.

    Strict config:
        * `extra="forbid"` — unknown fields fail validation rather than
          silently being dropped.
        * `strict=True` — no implicit type coercion (an int won't satisfy
          `str`, a str won't satisfy `bool`).
        * `populate_by_name=True` — fields with JSON aliases (when the
          server-side key isn't a valid Python identifier) can be
          constructed by either the python name or the alias.
    """

    model_config = ConfigDict(
        extra="forbid",
        strict=True,
        populate_by_name=True,
    )

    _hotlog_schema_key: ClassVar[str] = ""

    @classmethod
    def send(
        cls,
        client: Client,
        msg: Self | None = None,
        /,
        **kwargs: Any,
    ) -> IngestResult:
        """
        Ingest an event of this schema.

        Two equivalent forms — pick whichever reads better at the call site:

            User.send(client, msg)               # msg is a pre-built User
            User.send(client, email="x@x.com")   # construct from kwargs

        Both go through the same pydantic validation as direct construction,
        so wrong types / unknown fields / missing required keys all raise
        `pydantic.ValidationError` before any network call.
        """
        if msg is not None:
            if kwargs:
                raise TypeError(
                    f"{cls.__name__}.send() got both a positional instance "
                    "and keyword arguments — pass one or the other."
                )
            if not isinstance(msg, cls):
                raise TypeError(
                    f"{cls.__name__}.send() expected a {cls.__name__} "
                    f"instance, got {type(msg).__name__}."
                )
            instance: Self = msg
        else:
            instance = cls(**kwargs)
        return client.send(instance)
