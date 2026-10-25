"""
`hotlog` CLI. Currently only `generate` is implemented.

Run:
    uv run hotlog --help
    uv run hotlog generate --out my_app/hotlog_types.py
"""

from __future__ import annotations

import argparse
import os
import sys

import httpx

from hotlog import __version__
from hotlog.client import _resolve_base_url
from hotlog.codegen import render_module


def _cmd_generate(args: argparse.Namespace) -> int:
    api_key = args.api_key or os.environ.get("HOTLOG_API_KEY")
    if not api_key:
        print(
            "error: missing API key (pass --api-key or set HOTLOG_API_KEY)",
            file=sys.stderr,
        )
        return 2

    base_url = _resolve_base_url(args.api_url, args.dev)
    url = f"{base_url}/api/sdk/schemas"

    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15.0,
        )
    except httpx.HTTPError as e:
        print(f"error: could not reach {url}: {e}", file=sys.stderr)
        return 1

    if response.status_code != 200:
        try:
            err = response.json().get("error", {}).get("message", response.text)
        except ValueError:
            err = response.text
        print(f"error: HTTP {response.status_code} from {url}: {err}", file=sys.stderr)
        return 1

    payload = response.json()
    data = payload.get("data") or {}
    source = render_module(data)

    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(source)

    project_name = (data.get("project") or {}).get("name", "?")
    schema_count = len(data.get("schemas") or [])
    print(f"Wrote {args.out} ({schema_count} schemas from {project_name!r})")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="hotlog",
        description="Hotlog SDK toolkit.",
    )
    parser.add_argument("--version", action="version", version=f"hotlog {__version__}")

    sub = parser.add_subparsers(dest="command", required=True)

    gen = sub.add_parser(
        "generate",
        help="Generate a typed Python module from your project's active schemas.",
    )
    gen.add_argument(
        "--api-key",
        help="API key. Defaults to $HOTLOG_API_KEY.",
    )
    gen.add_argument(
        "--api-url",
        help="Base URL. Wins over --dev. Defaults to $HOTLOG_API_URL.",
    )
    gen.add_argument(
        "--dev",
        action="store_true",
        default=None,
        help="Target http://localhost:3000 (also via HOTLOG_DEV=1).",
    )
    gen.add_argument(
        "--out",
        default="hotlog_types.py",
        help="Output path. Defaults to ./hotlog_types.py",
    )
    gen.set_defaults(func=_cmd_generate)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    return args.func(args)  # type: ignore[no-any-return]


if __name__ == "__main__":
    raise SystemExit(main())
