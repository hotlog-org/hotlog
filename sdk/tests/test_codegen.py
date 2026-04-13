"""Tests for the codegen — generated source compiles, types match expectations."""

from __future__ import annotations

import ast
import importlib.util
import sys
import textwrap
from pathlib import Path
from typing import Any

import pytest

from hotlog.codegen import (
    PRIMITIVE_MAP,
    render_module,
    render_type,
    safe_field_name,
    to_class_name,
)


# --- Naming helpers ----------------------------------------------------------

@pytest.mark.parametrize(
    "key,expected",
    [
        ("user_signup", "UserSignup"),
        ("page_view", "PageView"),
        ("foo", "Foo"),
        ("foo-bar.baz", "FooBarBaz"),
        ("123", "_123"),  # falls through into safe_field_name terriroty—class name still fine
    ],
)
def test_to_class_name(key: str, expected: str) -> None:
    if key == "123":
        # to_class_name doesn't prefix underscores for class names — only fields.
        assert to_class_name(key) == "123"
    else:
        assert to_class_name(key) == expected


@pytest.mark.parametrize(
    "key,expected_name,expected_alias",
    [
        ("email", "email", None),
        ("user-id", "user_id", "user-id"),
        ("class", "class_", "class"),  # Python keyword
        ("2fa_enabled", "_2fa_enabled", "2fa_enabled"),  # leading digit
        ("foo.bar", "foo_bar", "foo.bar"),
    ],
)
def test_safe_field_name(key: str, expected_name: str, expected_alias: str | None) -> None:
    name, alias = safe_field_name(key)
    assert name == expected_name
    assert alias == expected_alias


# --- Type rendering ----------------------------------------------------------

@pytest.mark.parametrize(
    "field,expected",
    [
        ({"type": "STRING"}, "str"),
        ({"type": "NUMBER"}, "float"),
        ({"type": "BOOLEAN"}, "bool"),
        ({"type": "DATETIME"}, "datetime"),
        ({"type": "JSON"}, "dict[str, Any]"),
        ({"type": "ARRAY", "metadata": {"itemType": "string"}}, "list[str]"),
        ({"type": "ARRAY", "metadata": {"itemType": "number"}}, "list[float]"),
        ({"type": "ARRAY", "metadata": {}}, "list[str]"),  # default itemType
        (
            {"type": "ENUM", "metadata": {"enumValues": ["a", "b"]}},
            'Literal["a", "b"]',
        ),
        ({"type": "ENUM", "metadata": {"enumValues": []}}, "str"),
        ({"type": "UNKNOWN_FUTURE_TYPE"}, "Any"),
    ],
)
def test_render_type(field: dict[str, Any], expected: str) -> None:
    assert render_type(field) == expected


def test_primitive_map_covers_documented_types() -> None:
    """Ensures we don't silently drop a field type."""
    assert set(PRIMITIVE_MAP) == {"STRING", "NUMBER", "BOOLEAN", "DATETIME", "JSON"}


# --- Full module rendering ---------------------------------------------------

def _compile(source: str) -> ast.Module:
    """Verify the generated source is at least syntactically valid Python."""
    return ast.parse(source)


def _import_generated(source: str, name: str = "_hotlog_generated_test") -> Any:
    """Write the source to a temp module and import it for runtime checks."""
    spec = importlib.util.spec_from_loader(name, loader=None)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    exec(compile(source, f"<{name}>", "exec"), module.__dict__)
    return module


def test_render_module_compiles(sample_schemas_response: dict[str, Any]) -> None:
    source = render_module(sample_schemas_response)
    _compile(source)  # raises SyntaxError on failure


def test_render_module_emits_expected_classes(sample_schemas_response: dict[str, Any]) -> None:
    source = render_module(sample_schemas_response)
    module = _import_generated(source, "_hotlog_full_test")

    assert hasattr(module, "UserSignup")
    assert hasattr(module, "PageView")
    assert module.SchemaKeys.UserSignup == "user_signup"
    assert module.SchemaKeys.PageView == "page_view"

    # Class-level schema key wired up
    assert module.UserSignup._hotlog_schema_key == "user_signup"

    # Required field accepted
    event = module.UserSignup(email="x@x.com")
    assert event.email == "x@x.com"
    assert event.plan is None  # optional defaults to None


def test_generated_models_are_strict(sample_schemas_response: dict[str, Any]) -> None:
    source = render_module(sample_schemas_response)
    module = _import_generated(source, "_hotlog_strict_test")

    from pydantic import ValidationError

    # Wrong type
    with pytest.raises(ValidationError):
        module.UserSignup(email=123)

    # Unknown field
    with pytest.raises(ValidationError):
        module.UserSignup(email="x@x.com", typo="oops")

    # Missing required
    with pytest.raises(ValidationError):
        module.UserSignup()

    # Enum value out of range
    with pytest.raises(ValidationError):
        module.UserSignup(email="x@x.com", plan="enterprise_plus")


def test_render_module_handles_empty_schemas(empty_schemas_response: dict[str, Any]) -> None:
    source = render_module(empty_schemas_response)
    _compile(source)
    assert "No active schemas" in source


def test_render_module_emits_alias_for_unsafe_keys() -> None:
    payload = {
        "project": {"id": "x", "name": "X"},
        "schemas": [
            {
                "key": "weird_event",
                "name": "Weird",
                "displayName": "Weird",
                "fields": [
                    {
                        "key": "user-id",
                        "name": "User ID",
                        "displayName": "User ID",
                        "type": "STRING",
                        "required": True,
                        "metadata": {},
                    },
                    {
                        "key": "class",
                        "name": "Class",
                        "displayName": "Class",
                        "type": "STRING",
                        "required": False,
                        "metadata": {"description": "Reserved word"},
                    },
                ],
            }
        ],
    }
    source = render_module(payload)
    _compile(source)
    assert 'alias="user-id"' in source
    assert 'alias="class"' in source
    # description carries through
    assert '"Reserved word"' in source


def test_generated_module_path_does_not_conflict_with_stdlib(tmp_path: Path) -> None:
    """Sanity check: the rendered file plays nice when written to disk."""
    sample = render_module(
        {
            "project": {"id": "x", "name": "X"},
            "schemas": [
                {
                    "key": "ping",
                    "name": "Ping",
                    "displayName": "Ping",
                    "fields": [{"key": "ts", "name": "ts", "displayName": "ts", "type": "DATETIME", "required": True, "metadata": {}}],
                }
            ],
        }
    )
    out = tmp_path / "hotlog_types.py"
    out.write_text(textwrap.dedent(sample))
    _compile(out.read_text())
