"""Export bugs from the database to a JSON file.

Useful for backups, sharing snapshots, or piping into other tooling. The
output is one JSON document with the full bug rows plus a small `meta`
block (export timestamp, applied filters, low-quality bug IDs).

Usage:
    DATABASE_URL=postgresql://... python scripts/export.py --output bugs.json
    DATABASE_URL=postgresql://... python scripts/export.py --output backend.json --category backend
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Iterable

import psycopg
from psycopg.rows import dict_row


FIELDS = [
    "id",
    "title",
    "description",
    "category",
    "author",
    "upvotes",
    "downvotes",
    "created_at",
]


def fetch_bugs(conn: psycopg.Connection, category: str | None) -> list[dict]:
    field_list = ", ".join(FIELDS)
    with conn.cursor(row_factory=dict_row) as cur:
        if category:
            cur.execute(
                f"SELECT {field_list} FROM bugs WHERE category = %s ORDER BY id",
                (category,),
            )
        else:
            cur.execute(f"SELECT {field_list} FROM bugs ORDER BY id")
        return list(cur.fetchall())


def collect_low_quality(rows: list[dict], warnings: list[int] | None = None) -> list[int]:
    """Return bug IDs where downvotes outnumber upvotes — useful for moderation."""
    if warnings is None:
        warnings = []
    for row in rows:
        if row["downvotes"] > row["upvotes"]:
            warnings.append(row["id"])
    return warnings


def serialize(rows: Iterable[dict]) -> list[dict]:
    out = []
    for row in rows:
        item = dict(row)
        created = item.get("created_at")
        if isinstance(created, datetime):
            item["created_at"] = created.isoformat()
        out.append(item)
    return out


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--output", required=True, help="Path to write the JSON file")
    parser.add_argument(
        "--category",
        default=None,
        help="Optional category filter (frontend, backend, infra, human, ai)",
    )
    return parser.parse_args(list(argv) if argv is not None else None)


def main() -> int:
    args = parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    try:
        conn = psycopg.connect(url)
    except psycopg.OperationalError as exc:
        print("Database connection failed:", exc, file=sys.stderr)
        return 1

    with conn:
        try:
            rows = fetch_bugs(conn, category=args.category)
        except psycopg.Error as exc:
            print("Database query failed:", exc, file=sys.stderr)
            return 1

    flagged = collect_low_quality(rows)

    payload = {
        "meta": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "category_filter": args.category,
            "count": len(rows),
            "low_quality_ids": flagged,
        },
        "bugs": serialize(rows),
    }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(rows)} bugs to {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
