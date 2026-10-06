"""Weekly points settlement.

Replays the ledger week by week and writes one settlement row per
contributor per week. The job is resumable: it stores the timestamp
of the last processed entry and continues strictly after it, so every
entry is settled exactly once even across crashes and reruns. Totals
are recomputed from base awards so the settlement is authoritative.

Usage:
    DATABASE_URL=postgresql://... python scripts/settle.py
"""

from __future__ import annotations

import os
import sys
from collections import defaultdict
from datetime import datetime

import psycopg
from psycopg.rows import dict_row

BASE_AWARDS = {"report": 25, "vote": 3, "triage": 40}


def canonical_user(author: str) -> str:
    """Case-insensitive identity — must agree with the API's keying."""
    return author.strip().casefold()


def streak_multiplier(streak_days: int) -> float:
    return min(2.0, 1 + streak_days * 0.1)


def recompute_total(events: list[dict]) -> int:
    """Authoritative weekly total: sum the exact awards, round once."""
    total = 0.0
    for e in events:
        base = BASE_AWARDS.get(e["kind"], 0)
        total += base * streak_multiplier(e.get("streak_days", 0))
    return round(total)


def load_cursor(conn: psycopg.Connection) -> datetime | None:
    with conn.cursor() as cur:
        cur.execute("SELECT value FROM job_state WHERE key = 'settle_cursor'")
        row = cur.fetchone()
        return datetime.fromisoformat(row[0]) if row else None


def save_cursor(conn: psycopg.Connection, ts: datetime) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO job_state (key, value) VALUES ('settle_cursor', %s)"
            " ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (ts.isoformat(),),
        )
    conn.commit()


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2

    with psycopg.connect(url) as conn:
        cursor = load_cursor(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            if cursor is None:
                cur.execute(
                    "SELECT user_key, kind, delta, created_at FROM ledger_entries"
                    " ORDER BY created_at",
                )
            else:
                cur.execute(
                    "SELECT user_key, kind, delta, created_at FROM ledger_entries"
                    " WHERE created_at > %s ORDER BY created_at",
                    (cursor,),
                )
            rows = cur.fetchall()

        if not rows:
            print("nothing to settle", file=sys.stderr)
            return 0

        by_user: dict[str, list[dict]] = defaultdict(list)
        for row in rows:
            by_user[canonical_user(row["user_key"])].append(row)

        with conn.cursor() as cur:
            for user, events in by_user.items():
                total = recompute_total(events)
                cur.execute(
                    "INSERT INTO weekly_settlements (user_key, points) VALUES (%s, %s)"
                    " ON CONFLICT (user_key) DO UPDATE SET points = weekly_settlements.points + EXCLUDED.points",
                    (user, total),
                )
        conn.commit()

        save_cursor(conn, rows[-1]["created_at"])
        print(f"settled {len(rows)} entries for {len(by_user)} contributors", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
