"""
migrate_db.py — Applies schema changes to an existing StudyBudy.accdb.

Run whenever new columns are added. Safe to re-run — each migration is
skipped if the column already exists.

Usage:
    python migrate_db.py
"""

import sys, os
import pyodbc

sys.path.insert(0, os.path.dirname(__file__))
import config


def column_exists(conn_str: str, table: str, column: str) -> bool:
    """Return True if the column already exists in the table."""
    conn = pyodbc.connect(conn_str, autocommit=True)
    cur  = conn.cursor()
    try:
        cur.execute(f"SELECT TOP 1 {column} FROM {table}")
        conn.close()
        return True
    except Exception:
        conn.close()
        return False


def add_column(conn_str: str, table: str, column: str, definition: str) -> None:
    if column_exists(conn_str, table, column):
        print(f"  [skip] {table}.{column} already exists")
        return
    conn = pyodbc.connect(conn_str, autocommit=True)
    conn.cursor().execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
    conn.close()
    print(f"  [OK]   Added {table}.{column} ({definition})")


# ── Migration list ─────────────────────────────────────────────────────────────
# Each tuple: (table, column, Access_type)
# Append new entries here for future schema changes; never delete old ones.

MIGRATIONS = [
    # v2 — levelled questions + AI-generated summaries
    ("questions", "difficulty", "TEXT(10)"),
    ("courses",   "summary",   "MEMO"),
]


if __name__ == "__main__":
    print("StudyBudy — Database Migration")
    print("=" * 40)

    for table, column, defn in MIGRATIONS:
        add_column(config.ACCESS_CONN_STR, table, column, defn)

    print("\nDone. Restart the backend server after migrating.")
