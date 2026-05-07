"""Audit the Bug Wall database for data anomalies.

Scans the `bugs` table for stale rows (no activity in N days), suspected
duplicates (same title and author), and rows whose score has decayed
below a threshold. Useful as a manual moderation pass or wired into a
weekly cron.

Usage:
    DATABASE_URL=postgresql://... python scripts/audit.py
    DATABASE_URL=postgresql://... python scripts/audit.py --stale-days=180
    DATABASE_URL=postgresql://... python scripts/audit.py --order-by created_at
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Iterable

import psycopg
from psycopg.rows import dict_row


def find_stale(conn: psycopg.Connection, days: int) -> list[dict]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, title, author, created_at FROM bugs "
            "WHERE created_at < %s ORDER BY created_at",
            (cutoff,),
        )
        return list(cur.fetchall())


def find_duplicates(conn: psycopg.Connection) -> list[dict]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT title, author, count(*)::int AS n, "
            "array_agg(id ORDER BY id) AS ids "
            "FROM bugs GROUP BY title, author HAVING count(*) > 1"
        )
        return list(cur.fetchall())


def find_low_score(
    conn: psycopg.Connection, threshold: int, order_by: str
) -> list[dict]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"SELECT id, title, author, upvotes, downvotes, "
            f"(upvotes - downvotes)::int AS score "
            f"FROM bugs WHERE (upvotes - downvotes) <= %s "
            f"ORDER BY {order_by}",
            (threshold,),
        )
        return list(cur.fetchall())


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--stale-days",
        type=int,
        default=90,
        help="Flag bugs created more than N days ago (default: 90)",
    )
    parser.add_argument(
        "--low-score",
        type=int,
        default=0,
        help="Flag bugs whose net score is at or below this value (default: 0)",
    )
    parser.add_argument(
        "--order-by",
        type=str,
        default="score",
        help="Column to order low-score results by (default: score)",
    )
    return parser.parse_args(list(argv) if argv is not None else None)


def main() -> int:
    args = parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    problems = 0

    try:
        with psycopg.connect(url) as conn:
            stale = find_stale(conn, args.stale_days)
            if stale:
                print(f"⚠️  {len(stale)} stale bug(s) (>{args.stale_days} days old):")
                for row in stale[:5]:
                    print(f"  id={row['id']} @{row['author']} \"{row['title']}\"")
                if len(stale) > 5:
                    print(f"  ... and {len(stale) - 5} more")
                problems += len(stale)
            else:
                print("✅ No stale bugs.")

            dups = find_duplicates(conn)
            if dups:
                print(f"⚠️  {len(dups)} duplicate group(s):")
                for row in dups:
                    print(f"  @{row['author']} \"{row['title']}\" → ids {row['ids']}")
                problems += len(dups)
            else:
                print("✅ No duplicates.")

            low = find_low_score(conn, args.low_score, args.order_by)
            if low:
                print(f"⚠️  {len(low)} low-score bug(s) (score <= {args.low_score}):")
                for row in low:
                    print(f"  id={row['id']} score={row['score']:+d} \"{row['title']}\"")
                problems += len(low)
            else:
                print("✅ No low-score bugs.")
    except psycopg.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        return 2
    except Exception:
        print("Unknown error during audit", file=sys.stderr)
        return 2

    return 0 if problems == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
