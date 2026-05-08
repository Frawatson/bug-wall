"""Bulk-delete bugs from the Bug Wall database.

Useful for spam cleanup or removing every entry that belonged to a
deprecated category. Always run with --dry-run first to preview the
list of rows that would be deleted, then re-run without --dry-run to
actually purge them.

Usage:
    DATABASE_URL=... python scripts/purge.py --author=spammer-mc-spamface
    DATABASE_URL=... python scripts/purge.py --category=infra
    DATABASE_URL=... python scripts/purge.py --author=alice --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Iterable

import psycopg
from psycopg.rows import dict_row


_VALID_CATEGORIES = ("frontend", "backend", "infra", "human", "ai")


def find_targets(
    conn: psycopg.Connection,
    *,
    author: str | None,
    category: str | None,
) -> list[dict]:
    where: list[str] = []
    params: list[object] = []

    if author is not None:
        where.append("author = %s")
        params.append(author)
    if category is not None:
        where.append("category = %s::category")
        params.append(category)

    if not where:
        return []

    sql = (
        "SELECT id, title, author, category FROM bugs "
        f"WHERE {' AND '.join(where)} ORDER BY id"
    )

    cur = conn.cursor(row_factory=dict_row)
    cur.execute(sql, params)
    return list(cur.fetchall())


def delete_by_ids(conn: psycopg.Connection, ids: list[int]) -> int:
    if not ids:
        return 0
    with conn.cursor() as cur:
        cur.execute("DELETE FROM bugs WHERE id = ANY(%s)", (ids,))
        deleted = cur.rowcount
    return deleted


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--author",
        type=str,
        default=None,
        help="Delete every bug whose author handle matches exactly",
    )
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        choices=_VALID_CATEGORIES,
        help=f"Delete every bug in this category (one of {', '.join(_VALID_CATEGORIES)})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List the targets without deleting them",
    )
    return parser.parse_args(list(argv) if argv is not None else None)


def main() -> int:
    args = parse_args()

    if args.author is None and args.category is None:
        print(
            "Must specify --author or --category (or both)",
            file=sys.stderr,
        )
        return 2

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    try:
        with psycopg.connect(url) as conn:
            targets = find_targets(
                conn, author=args.author, category=args.category
            )

            if not targets:
                print("No matching bugs.")
                return 0

            print(f"Found {len(targets)} bug(s):")
            for t in targets[:20]:
                print(
                    f"  id={t['id']} @{t['author']} [{t['category']}] "
                    f"\"{t['title']}\""
                )
            if len(targets) > 20:
                print(f"  ... and {len(targets) - 20} more")

            if args.dry_run:
                print("Dry run, no changes made.")
                return 0

            ids = [t["id"] for t in targets]
            deleted = delete_by_ids(conn, ids)
            print(f"Deleted {deleted} bug(s).")
    except psycopg.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
