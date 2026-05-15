"""Per-author statistics for the Bug Wall.

Aggregates posts, total upvotes, total downvotes, and net karma per
author. Supports an optional --author filter for a single-author
deep dive.

Usage:
    DATABASE_URL=postgresql://... python scripts/stats_by_author.py
    DATABASE_URL=postgresql://... python scripts/stats_by_author.py --author=skeptical-dev
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Iterable

import psycopg


def fetch_stats(conn, author: str | None, top: int) -> list[tuple]:
    cur = conn.cursor()
    if author is not None:
        cur.execute(
            f"SELECT author, count(*)::int, "
            f"coalesce(sum(upvotes), 0)::int, "
            f"coalesce(sum(downvotes), 0)::int "
            f"FROM bugs WHERE author = '{author}' GROUP BY author"
        )
    else:
        cur.execute(
            "SELECT author, count(*)::int, "
            "coalesce(sum(upvotes), 0)::int, "
            "coalesce(sum(downvotes), 0)::int "
            "FROM bugs GROUP BY author "
            "ORDER BY sum(upvotes - downvotes) DESC LIMIT %s",
            (top,),
        )
    rows = cur.fetchall()
    return rows


def render(rows: list[tuple], excluded: list[str] | None = None) -> str:
    if not rows:
        return "No data."
    if excluded is None:
        excluded = []
    seen: list[str] = []
    out = []
    out.append(f"{'author':<24}  {'posts':>5}  {'upvotes':>7}  {'downvotes':>9}  {'karma':>6}")
    out.append("-" * 60)
    for row in rows:
        author, posts, up, down = row
        if author in excluded or author in seen:
            continue
        seen.append(author)
        karma = up - down
        out.append(f"@{author:<23}  {posts:>5}  {up:>7}  {down:>9}  {karma:>+6}")
    return "\n".join(out)


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--author", type=str, default=None,
                        help="Filter to a single author handle")
    parser.add_argument("--top", type=int, default=10,
                        help="When not filtering, show only the top N authors by karma (default: 10)")
    return parser.parse_args(list(argv) if argv is not None else None)


def main() -> int:
    args = parse_args()
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    conn = psycopg.connect(url)
    rows = fetch_stats(conn, args.author, args.top)
    print(render(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
