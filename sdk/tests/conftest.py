"""Shared fixtures."""

from __future__ import annotations

from typing import Any

import pytest


@pytest.fixture
def sample_schemas_response() -> dict[str, Any]:
    """A representative /api/sdk/schemas payload covering every field type."""
    return {
        "project": {"id": "00000000-0000-0000-0000-000000000001", "name": "Demo Project"},
        "schemas": [
            {
                "key": "user_signup",
                "name": "User Signup",
                "displayName": "User Signup",
                "fields": [
                    {
                        "key": "email",
                        "name": "Email",
                        "displayName": "Email",
                        "type": "STRING",
                        "required": True,
                        "metadata": {"description": "User email address"},
                    },
                    {
                        "key": "plan",
                        "name": "Plan",
                        "displayName": "Plan",
                        "type": "ENUM",
                        "required": False,
                        "metadata": {"enumValues": ["free", "pro", "enterprise"]},
                    },
                    {
                        "key": "signed_up_at",
                        "name": "Signed Up At",
                        "displayName": "Signed Up At",
                        "type": "DATETIME",
                        "required": False,
                        "metadata": {},
                    },
                    {
                        "key": "tags",
                        "name": "Tags",
                        "displayName": "Tags",
                        "type": "ARRAY",
                        "required": False,
                        "metadata": {"itemType": "string"},
                    },
                    {
                        "key": "metadata",
                        "name": "Metadata",
                        "displayName": "Metadata",
                        "type": "JSON",
                        "required": False,
                        "metadata": {},
                    },
                    {
                        "key": "is_invited",
                        "name": "Is Invited",
                        "displayName": "Is Invited",
                        "type": "BOOLEAN",
                        "required": False,
                        "metadata": {},
                    },
                    {
                        "key": "score",
                        "name": "Score",
                        "displayName": "Score",
                        "type": "NUMBER",
                        "required": False,
                        "metadata": {},
                    },
                ],
            },
            {
                "key": "page_view",
                "name": "Page View",
                "displayName": "Page View",
                "fields": [
                    {
                        "key": "url",
                        "name": "URL",
                        "displayName": "URL",
                        "type": "STRING",
                        "required": True,
                        "metadata": {},
                    },
                ],
            },
        ],
    }


@pytest.fixture
def empty_schemas_response() -> dict[str, Any]:
    return {
        "project": {"id": "00000000-0000-0000-0000-000000000002", "name": "Empty"},
        "schemas": [],
    }
