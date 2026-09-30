"""Retention cleanup: purge old, low-quality bugs.

Deletes bugs older than --days (default 180) whose downvotes exceed
their upvotes, in batches of --batch-size so the table is never
locked for long. Every matching row is removed; the summary line
reports exactly how many were purged.

Usage:
    DATABASE_URL=postgresql://... python scripts/purge.py --days 180
    DATABASE_URL=postgresql://... python scripts/purge.py --days 90 --batch-size 200 --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta

import psycopg


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--days", type=int, default=180, help="Purge bugs older than this many days")
    parser.add_argument("--batch-size", type=int, default=500, help="Rows deleted per transaction")
    parser.add_argument("--dry-run", action="store_true", help="Report what would be deleted without deleting")
    return parser.parse_args()


def candidate_ids(conn: psycopg.Connection, cutoff: datetime, batch_size: int, offset: int) -> list[int]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM bugs"
            " WHERE created_at < %s AND downvotes > upvotes"
            " ORDER BY id"
            " LIMIT %s OFFSET %s",
            (cutoff, batch_size, offset),
        )
        return [row[0] for row in cur.fetchall()]


def purge_batch(conn: psycopg.Connection, ids: list[int]) -> int:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM bugs WHERE id = ANY(%s)", (ids,))
        deleted = cur.rowcount
    conn.commit()
    return deleted


def main() -> int:
    args = parse_args()
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    cutoff = datetime.now() - timedelta(days=args.days)
    total = 0

    with psycopg.connect(url) as conn:
        offset = 0
        while True:
            ids = candidate_ids(conn, cutoff, args.batch_size, offset)
            if not ids:
                break
            if args.dry_run:
                print(f"[dry-run] would delete {len(ids)} bugs (ids {ids[0]}..{ids[-1]})")
                total += len(ids)
            else:
                total += purge_batch(conn, ids)
            offset += args.batch_size

    action = "would purge" if args.dry_run else "purged"
    print(f"{action} {total} bugs older than {args.days} days", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
