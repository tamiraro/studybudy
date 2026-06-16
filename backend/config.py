"""
config.py — Central configuration for the StudyBudy backend.

To switch databases:  change DB_DRIVER to 'sqlite' (or 'postgres', etc.)
                       and update DB_PATH / DB_URL accordingly.
To deploy to a server: point DB_PATH at the server's file path,
                       or swap the driver and URL for a hosted database.
"""

import os

# ── Database ─────────────────────────────────────────────────────────────────
# Which database driver to use.  The factory in db/__init__.py reads this
# and returns the matching repository implementation.
# Supported values: 'access'   (MS Access .accdb via pyodbc — current)
#                   'sqlite'   (planned — no extra setup needed)
#                   'postgres' (planned — requires psycopg2 + a running server)
DB_DRIVER = os.environ.get("SB_DB_DRIVER", "access")

# Absolute path to the MS Access database file.
# Change this to an environment variable or a relative path when deploying.
DB_PATH = os.environ.get(
    "SB_DB_PATH",
    os.path.join(os.path.dirname(__file__), "StudyBudy.accdb"),
)

# ODBC connection string for MS Access (used by access_db.py).
# Switching to another database only requires changing this string
# (and providing the matching repository class).
ACCESS_CONN_STR = (
    r"Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
    rf"DBQ={DB_PATH};"
)

# ── Auth ─────────────────────────────────────────────────────────────────────
# Random secret used to sign tokens in the future (JWT etc.).
# Override via environment variable in production.
SECRET_KEY = os.environ.get("SB_SECRET_KEY", "change-me-in-production-please")

# Session token lifetime in days.
TOKEN_TTL_DAYS = int(os.environ.get("SB_TOKEN_TTL_DAYS", "30"))

# ── Server ───────────────────────────────────────────────────────────────────
# Bind address and port for the Flask dev server.
HOST = os.environ.get("SB_HOST", "127.0.0.1")
PORT = int(os.environ.get("SB_PORT", "5000"))
DEBUG = os.environ.get("SB_DEBUG", "true").lower() == "true"
