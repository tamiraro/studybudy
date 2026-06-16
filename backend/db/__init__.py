"""
db/__init__.py — Database connection factory.

Call get_repos() to get a (users, sessions, courses, questions) tuple
ready to use.  The specific implementation is chosen by config.DB_DRIVER.

Adding a new database backend:
    1. Write db/<name>.py with classes <Name>UserRepo, <Name>SessionRepo, etc.
    2. Add an elif branch in get_repos() below.
    3. Set DB_DRIVER='<name>' in config.py (or SB_DB_DRIVER env var).
"""

import pyodbc
import config
from db.base import UserRepo, SessionRepo, CourseRepo, QuestionRepo


def _access_connection() -> pyodbc.Connection:
    """Open a persistent pyodbc connection to the MS Access file."""
    return pyodbc.connect(config.ACCESS_CONN_STR, autocommit=False)


def get_repos(conn=None):
    """
    Return (UserRepo, SessionRepo, CourseRepo, QuestionRepo) instances
    for the configured database driver.

    Pass an existing `conn` in tests to inject a mock connection.
    """
    driver = config.DB_DRIVER

    if driver == "access":
        from db.access_db import (
            AccessUserRepo, AccessSessionRepo,
            AccessCourseRepo, AccessQuestionRepo,
        )
        connection = conn or _access_connection()
        return (
            AccessUserRepo(connection),
            AccessSessionRepo(connection),
            AccessCourseRepo(connection),
            AccessQuestionRepo(connection),
        )

    # ── Future drivers ───────────────────────────────────────────────────────
    # elif driver == "sqlite":
    #     from db.sqlite_db import SqliteUserRepo, ...
    #     import sqlite3
    #     connection = conn or sqlite3.connect(config.SQLITE_PATH)
    #     return (SqliteUserRepo(connection), ...)
    #
    # elif driver == "postgres":
    #     from db.postgres_db import PgUserRepo, ...
    #     import psycopg2
    #     connection = conn or psycopg2.connect(config.PG_DSN)
    #     return (PgUserRepo(connection), ...)

    else:
        raise ValueError(f"Unknown DB_DRIVER: {driver!r}")
