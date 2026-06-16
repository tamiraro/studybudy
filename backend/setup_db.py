"""
setup_db.py — One-time database initialisation script.

Run once before starting the server:
    python setup_db.py

What it does:
    1. Creates the MS Access .accdb file (if it doesn't exist yet)
       using the ADOX COM library (requires pywin32 + MS Access installed).
    2. Creates the four tables: users, sessions, courses, questions.
       Tables that already exist are skipped.

To migrate to a different database in the future:
    - Write a parallel setup script (e.g. setup_sqlite.py, setup_postgres.py)
      that creates the same schema in the target database.
    - The table structure and column names stay identical.
"""

import sys
import os
import pyodbc

# Force UTF-8 output on Windows terminals with narrow code-page encodings
if sys.stdout.encoding and sys.stdout.encoding.upper() not in ("UTF-8", "UTF8"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(__file__))
import config


# ── Step 1: create the .accdb file ───────────────────────────────────────────

def create_accdb(path: str) -> None:
    """Use ADOX via win32com to create a new, empty .accdb file."""
    if os.path.exists(path):
        print(f"  [OK] Database file already exists: {path}")
        return

    try:
        import win32com.client
        catalog = win32com.client.Dispatch("ADOX.Catalog")
        catalog.Create(
            f"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={path};"
        )
        del catalog
        print(f"  [OK] Created database file: {path}")
    except Exception as exc:
        print(f"  [ERR] Could not create .accdb via ADOX: {exc}")
        print("    Make sure Microsoft Access (or Access Runtime) is installed.")
        sys.exit(1)


# ── Step 2: create tables ─────────────────────────────────────────────────────

# Each table is defined as (table_name, CREATE_TABLE_sql).
# Access SQL notes:
#   AUTOINCREMENT = auto-increment integer PK (same as COUNTER)
#   MEMO          = unlimited-length text (equivalent to TEXT in other DBs)
#   TEXT(n)       = varchar(n)
#   DATETIME      = date + time
#   NOT NULL      = required field
TABLES = [
    (
        "users",
        """
        CREATE TABLE users (
            id            AUTOINCREMENT PRIMARY KEY,
            first_name    TEXT(100)  NOT NULL,
            last_name     TEXT(100)  NOT NULL,
            username      TEXT(50)   NOT NULL,
            email         TEXT(200)  NOT NULL,
            phone         TEXT(50),
            role          TEXT(20),
            password_hash TEXT(255)  NOT NULL,
            created_at    DATETIME
        )
        """,
    ),
    (
        "sessions",
        """
        CREATE TABLE sessions (
            id         AUTOINCREMENT PRIMARY KEY,
            user_id    INTEGER   NOT NULL,
            token      TEXT(64)  NOT NULL,
            created_at DATETIME,
            expires_at DATETIME
        )
        """,
    ),
    (
        "courses",
        """
        CREATE TABLE courses (
            id           TEXT(36)  NOT NULL PRIMARY KEY,
            user_id      INTEGER   NOT NULL,
            name         TEXT(200) NOT NULL,
            emoji        TEXT(10),
            color        TEXT(30),
            notes        MEMO,
            created_at   DATETIME,
            last_studied DATETIME
        )
        """,
    ),
    (
        "questions",
        """
        CREATE TABLE questions (
            id            TEXT(36)  NOT NULL PRIMARY KEY,
            course_id     TEXT(36)  NOT NULL,
            question_text MEMO      NOT NULL,
            answer_text   MEMO      NOT NULL,
            question_type TEXT(20),
            created_at    DATETIME
        )
        """,
    ),
]


def table_exists(cursor: pyodbc.Cursor, table_name: str) -> bool:
    """Return True if the table already exists in the database."""
    tables = [row.table_name for row in cursor.tables(tableType="TABLE")]
    return table_name.lower() in [t.lower() for t in tables]


def create_tables(conn_str: str) -> None:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cur  = conn.cursor()

    for name, ddl in TABLES:
        if table_exists(cur, name):
            print(f"  [OK] Table '{name}' already exists — skipped.")
        else:
            cur.execute(ddl)
            print(f"  [OK] Created table '{name}'.")

    conn.close()


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("StudyBudy — Database Setup")
    print("=" * 40)

    print("\n[1/2] Creating database file…")
    create_accdb(config.DB_PATH)

    print("\n[2/2] Creating tables…")
    create_tables(config.ACCESS_CONN_STR)

    print("\nDone. Setup complete. Start the server with:  python app.py")
