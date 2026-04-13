"""
Type-safe Python SDK for the Hotlog event platform.

Most code only needs:

    from hotlog import Client, Event

The exception classes live in `hotlog.errors`:

    from hotlog.errors import AuthError, ValidationError

`IngestResult` is exported here too since it's the return type of `Client.send`.
"""

from hotlog.client import Client, IngestResult
from hotlog.models import Event

__all__ = ["Client", "Event", "IngestResult"]

__version__ = "0.1.0"
