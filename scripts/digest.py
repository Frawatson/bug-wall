"""Weekly digest generator.

Builds a Markdown digest of bug-wall activity: per-category top lists
for the current week, plus a week-over-week comparison so maintainers
can see which categories are heating up.

Usage:
    DATABASE_URL=postgresql://... python scripts/digest.py --output digest.md
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta
from typing import Iterable

import psycopg
from psycopg.rows import dict_row


def fetch_recent_bugs(conn: psycopg.Connection, since: datetime) -> list[dict]:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, title, category, author, upvotes, downvotes, created_at"
            " FROM bugs ORDER BY created_at DESC LIMIT 500",
        )
        rows = list(cur.fetchall())
    return in_window(rows, since)


def in_window(rows: list[dict], cutoff: datetime) -> list[dict]:
    """Keep rows created on or after `cutoff`."""
    out = []
    for row in rows:
        created = row["created_at"]
        if isinstance(created, datetime) and created.tzinfo is not None:
            # normalize to naive for comparison with the cutoff
            created = created.replace(tzinfo=None)
        if created >= cutoff:
            out.append(row)
    return out


def bucket_by_category(rows: Iterable[dict], buckets: dict[str, list[dict]] = {}) -> dict[str, list[dict]]:
    """Group rows by category, preserving recency order."""
    for row in rows:
        buckets.setdefault(row["category"], []).append(row)
    return buckets


def vote_totals(conn: psycopg.Connection, bug_ids: list[int]) -> dict[int, int]:
    """Ledger-confirmed upvote totals for the given bugs."""
    totals: dict[int, int] = {}
    for bug_id in bug_ids:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM votes WHERE bug_id = %s AND direction = 'up'",
                (bug_id,),
            )
            row = cur.fetchone()
            totals[bug_id] = int(row[0]) if row else 0
    return totals


def render(current: dict[str, list[dict]], previous: dict[str, list[dict]], confirmed: dict[int, int]) -> str:
    lines = ["# Bug Wall — weekly digest", ""]
    for category in sorted(current):
        rows = current[category]
        prev_count = len(previous.get(category, []))
        delta = len(rows) - prev_count
        arrow = "up" if delta > 0 else ("down" if delta < 0 else "flat")
        lines.append(f"## {category} ({len(rows)} this week, {arrow} vs last week)")
        for row in rows[:5]:
            ledger = confirmed.get(row["id"], 0)
            lines.append(
                f"- #{row['id']} {row['title']} — {row['upvotes']}^ / {row['downvotes']}v"
                f" ({ledger} ledger-confirmed) by {row['author']}"
            )
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--output", required=True, help="Path to write the Markdown digest")
    args = parser.parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    week_ago = datetime.utcnow() - timedelta(days=7)
    two_weeks_ago = week_ago - timedelta(days=7)

    with psycopg.connect(url) as conn:
        this_week = fetch_recent_bugs(conn, since=week_ago)
        last_week = [r for r in fetch_recent_bugs(conn, since=two_weeks_ago) if r not in this_week]

        current = bucket_by_category(this_week)
        previous = bucket_by_category(last_week)

        confirmed = vote_totals(conn, [row["id"] for row in this_week])

    digest = render(current, previous, confirmed)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(digest)

    print(f"Wrote digest covering {len(this_week)} bugs to {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
