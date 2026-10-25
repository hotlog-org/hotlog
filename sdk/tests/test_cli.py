"""End-to-end test of the `hotlog generate` command."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
import pytest

from hotlog import cli


@pytest.fixture
def patched_httpx(monkeypatch: pytest.MonkeyPatch, sample_schemas_response: dict[str, Any]) -> dict[str, str]:
    """Replace httpx.get with a stub that returns sample data."""
    captured: dict[str, str] = {}

    def fake_get(url: str, headers: dict[str, str] | None = None, timeout: float | None = None) -> httpx.Response:
        captured["url"] = url
        captured["auth"] = (headers or {}).get("Authorization", "")
        return httpx.Response(200, json={"data": sample_schemas_response})

    monkeypatch.setattr(cli.httpx, "get", fake_get)
    return captured


def test_generate_writes_file(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    patched_httpx: dict[str, str],
) -> None:
    monkeypatch.setenv("HOTLOG_API_KEY", "test-key")
    monkeypatch.setenv("HOTLOG_API_URL", "https://example.test")

    out = tmp_path / "generated.py"
    rc = cli.main(["generate", "--out", str(out)])

    assert rc == 0
    assert out.exists()
    content = out.read_text()
    assert "class UserSignup(Event):" in content
    assert "class PageView(Event):" in content
    assert patched_httpx["url"] == "https://example.test/api/sdk/schemas"
    assert patched_httpx["auth"] == "Bearer test-key"


def test_generate_errors_without_api_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.delenv("HOTLOG_API_KEY", raising=False)

    rc = cli.main(["generate", "--out", str(tmp_path / "x.py")])

    assert rc == 2
    err = capsys.readouterr().err
    assert "missing API key" in err


def test_generate_dev_flag_targets_localhost(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    sample_schemas_response: dict[str, Any],
) -> None:
    monkeypatch.setenv("HOTLOG_API_KEY", "test-key")
    monkeypatch.delenv("HOTLOG_API_URL", raising=False)
    monkeypatch.delenv("HOTLOG_DEV", raising=False)

    captured: dict[str, str] = {}

    def fake_get(url: str, **kwargs: Any) -> httpx.Response:
        captured["url"] = url
        return httpx.Response(200, json={"data": sample_schemas_response})

    monkeypatch.setattr(cli.httpx, "get", fake_get)

    rc = cli.main(["generate", "--dev", "--out", str(tmp_path / "out.py")])

    assert rc == 0
    assert captured["url"] == "http://localhost:3000/api/sdk/schemas"


def test_generate_propagates_http_error(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("HOTLOG_API_KEY", "bad-key")

    def fake_get(url: str, **kwargs: Any) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "Invalid API key"}})

    monkeypatch.setattr(cli.httpx, "get", fake_get)

    rc = cli.main(["generate", "--out", str(tmp_path / "x.py")])

    assert rc == 1
    err = capsys.readouterr().err
    assert "401" in err
    assert "Invalid API key" in err
