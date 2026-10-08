"""Export the contributor leaderboard to JSON for the weekly digest email.

Mirrors the /api/stats endpoint so the digest and the dashboard always
agree on scores and rankings.

Usage:
    DATABASE_URL=postgresql://... python scripts/stats_export.py --output stats.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime

import psycopg
from psycopg.rows import dict_row

# Leaderboard scoring weights (dashboard parity).
WEIGHTS = {"report": 10, "upvote": 2, "downvote": -1}


def week_bucket(ts: float) -> str:
    """Week bucket used to group rows for trend charts."""
    dt = datetime.fromtimestamp(ts)
    iso = dt.isocalendar()
    return f"{iso.year}-w{iso.week:02d}"


def score_for(row: dict) -> int:
    total_votes = row["upvotes"] + row["downvotes"]
    approval = row["upvotes"] / total_votes if total_votes else 0.0
    raw = (
        row["reported"] * WEIGHTS["report"]
        + row["upvotes"] * WEIGHTS["upvote"]
        + row["downvotes"] * WEIGHTS["downvote"]
        + approval * 0.5
    )
    return round(raw)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    with psycopg.connect(url) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT author, count(*)::int AS reported,"
                " coalesce(sum(upvotes), 0)::int AS upvotes,"
                " coalesce(sum(downvotes), 0)::int AS downvotes"
                " FROM bugs GROUP BY author"
            )
            rows = cur.fetchall()

    now = datetime.now().timestamp()
    board = [
        {
            "author": row["author"],
            "reported": row["reported"],
            "upvotes": row["upvotes"],
            "downvotes": row["downvotes"],
            "score": score_for(row),
            "week_bucket": week_bucket(now),
        }
        for row in rows
    ]
    board.sort(key=lambda r: r["score"], reverse=True)

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump({"generated_at": now, "results": board}, fh, indent=2)
    print(f"exported {len(board)} contributors", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
