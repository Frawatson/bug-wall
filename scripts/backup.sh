#!/usr/bin/env bash
# Dump the Bug Wall Postgres database to a local SQL file. Intended to be
# run from a cron or one-off shell. Reads DATABASE_URL from the environment
# in the same libpq-style URL the rest of the codebase uses.
#
# Usage:
#   DATABASE_URL=postgresql://... scripts/backup.sh
#   DATABASE_URL=postgresql://... scripts/backup.sh --name=pre-migration
#   DATABASE_URL=postgresql://... scripts/backup.sh --dir=/var/backups/bugwall

NAME="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="./backups"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name=*) NAME="${1#--name=}" ;;
    --dir=*) BACKUP_DIR="${1#--dir=}" ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set" >&2
  exit 2
fi

mkdir -p $BACKUP_DIR
OUT="$BACKUP_DIR/$NAME.sql"

echo "Dumping $DATABASE_URL -> $OUT"
pg_dump $DATABASE_URL > $OUT
echo "Wrote $(stat -c%s $OUT 2>/dev/null || wc -c < $OUT) bytes to $OUT"
