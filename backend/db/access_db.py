"""
db/access_db.py — MS Access (pyodbc) implementations of every repository.

All SQL is Access-dialect (Jet/ACE engine):
  - AUTOINCREMENT / COUNTER for auto-increment PK
  - MEMO for unlimited text (>255 chars)
  - DATETIME for timestamps  (formatted as #YYYY-MM-DD HH:MM:SS#)
  - No IF NOT EXISTS on CREATE TABLE  (setup_db.py handles that check)
  - No RETURNING clause  (re-SELECT after INSERT to get the new row)
  - Identifiers with spaces must be bracketed: [column name]

To switch to another database, write a parallel file (e.g. sqlite_db.py)
that subclasses the same base classes and update db/__init__.py.
"""

import pyodbc
from datetime import datetime, timezone
from typing import Optional

from db.base import UserRepo, SessionRepo, CourseRepo, QuestionRepo


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_str() -> str:
    """Current UTC time formatted for Access DATETIME literals."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def _dt_str(dt) -> Optional[str]:
    """Convert a datetime (or None) to an ISO string for JSON responses."""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)

def _row_to_dict(cursor, row) -> dict:
    """Convert a pyodbc Row to a plain dict using cursor description."""
    return {col[0]: val for col, val in zip(cursor.description, row)}


# ── User ──────────────────────────────────────────────────────────────────────

class AccessUserRepo(UserRepo):

    def __init__(self, conn: pyodbc.Connection):
        self.conn = conn

    def create(self, first_name, last_name, username, email,
               phone, role, password_hash) -> dict:
        cur = self.conn.cursor()

        # Reject duplicates before inserting (Access has no ON CONFLICT)
        cur.execute("SELECT id FROM users WHERE username = ? OR email = ?",
                    username, email)
        if cur.fetchone():
            raise ValueError("Username or email already in use.")

        now = _now_str()
        cur.execute(
            """INSERT INTO users
               (first_name, last_name, username, email, phone, role,
                password_hash, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            first_name, last_name, username, email,
            phone, role, password_hash, now,
        )
        self.conn.commit()

        # Re-fetch the new row (Access has no RETURNING)
        cur.execute("SELECT * FROM users WHERE username = ?", username)
        row = cur.fetchone()
        d = _row_to_dict(cur, row)
        d["created_at"] = _dt_str(d.get("created_at"))
        return d

    def find_by_id(self, user_id: int) -> Optional[dict]:
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?", user_id)
        row = cur.fetchone()
        if not row:
            return None
        d = _row_to_dict(cur, row)
        d["created_at"] = _dt_str(d.get("created_at"))
        return d

    def find_by_username_or_email(self, identifier: str) -> Optional[dict]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            identifier, identifier,
        )
        row = cur.fetchone()
        if not row:
            return None
        d = _row_to_dict(cur, row)
        d["created_at"] = _dt_str(d.get("created_at"))
        return d


# ── Session ───────────────────────────────────────────────────────────────────

class AccessSessionRepo(SessionRepo):

    def __init__(self, conn: pyodbc.Connection):
        self.conn = conn

    def create(self, user_id: int, token: str, expires_at) -> dict:
        cur = self.conn.cursor()
        now = _now_str()
        exp = expires_at.strftime("%Y-%m-%d %H:%M:%S") if expires_at else _now_str()
        cur.execute(
            "INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)",
            user_id, token, now, exp,
        )
        self.conn.commit()
        return {"user_id": user_id, "token": token, "expires_at": _dt_str(expires_at)}

    def find_by_token(self, token: str) -> Optional[dict]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM sessions WHERE token = ? AND expires_at > ?",
            token, _now_str(),
        )
        row = cur.fetchone()
        if not row:
            return None
        d = _row_to_dict(cur, row)
        d["created_at"] = _dt_str(d.get("created_at"))
        d["expires_at"] = _dt_str(d.get("expires_at"))
        return d

    def delete(self, token: str) -> bool:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM sessions WHERE token = ?", token)
        self.conn.commit()
        return cur.rowcount > 0

    def delete_expired(self) -> int:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM sessions WHERE expires_at <= ?", _now_str())
        self.conn.commit()
        return cur.rowcount


# ── Course ────────────────────────────────────────────────────────────────────

class AccessCourseRepo(CourseRepo):

    def __init__(self, conn: pyodbc.Connection):
        self.conn = conn

    def _serialize(self, cur, row) -> dict:
        d = _row_to_dict(cur, row)
        d["created_at"]   = _dt_str(d.get("created_at"))
        d["last_studied"] = _dt_str(d.get("last_studied"))
        return d

    def get_by_user(self, user_id: int) -> list:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC",
            user_id,
        )
        return [self._serialize(cur, row) for row in cur.fetchall()]

    def get_by_id(self, course_id: str, user_id: int) -> Optional[dict]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM courses WHERE id = ? AND user_id = ?",
            course_id, user_id,
        )
        row = cur.fetchone()
        return self._serialize(cur, row) if row else None

    def create(self, user_id: int, course_id: str, name: str,
               emoji: str, color: str) -> dict:
        cur = self.conn.cursor()
        now = _now_str()
        cur.execute(
            """INSERT INTO courses (id, user_id, name, emoji, color,
               notes, created_at, last_studied)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            course_id, user_id, name, emoji, color, "", now, None,
        )
        self.conn.commit()
        cur.execute(
            "SELECT * FROM courses WHERE id = ?", course_id,
        )
        return self._serialize(cur, cur.fetchone())

    def update_notes(self, course_id: str, user_id: int, notes: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "UPDATE courses SET notes = ? WHERE id = ? AND user_id = ?",
            notes, course_id, user_id,
        )
        self.conn.commit()
        return cur.rowcount > 0

    def update_summary(self, course_id: str, user_id: int, summary_json: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "UPDATE courses SET summary = ? WHERE id = ? AND user_id = ?",
            summary_json, course_id, user_id,
        )
        self.conn.commit()
        return cur.rowcount > 0

    def touch_last_studied(self, course_id: str, user_id: int) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "UPDATE courses SET last_studied = ? WHERE id = ? AND user_id = ?",
            _now_str(), course_id, user_id,
        )
        self.conn.commit()
        return cur.rowcount > 0

    def delete(self, course_id: str, user_id: int) -> bool:
        cur = self.conn.cursor()
        # Delete child questions first (Access has no ON DELETE CASCADE via ODBC)
        cur.execute("DELETE FROM questions WHERE course_id = ?", course_id)
        cur.execute(
            "DELETE FROM courses WHERE id = ? AND user_id = ?",
            course_id, user_id,
        )
        self.conn.commit()
        return cur.rowcount > 0


# ── Question ──────────────────────────────────────────────────────────────────

class AccessQuestionRepo(QuestionRepo):

    def __init__(self, conn: pyodbc.Connection):
        self.conn = conn

    def _serialize(self, cur, row) -> dict:
        d = _row_to_dict(cur, row)
        d["created_at"] = _dt_str(d.get("created_at"))
        return d

    def get_by_course(self, course_id: str) -> list:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM questions WHERE course_id = ? ORDER BY created_at ASC",
            course_id,
        )
        return [self._serialize(cur, row) for row in cur.fetchall()]

    def bulk_create(self, course_id: str, questions: list) -> list:
        cur = self.conn.cursor()
        now = _now_str()
        created = []
        for q in questions:
            cur.execute(
                """INSERT INTO questions
                   (id, course_id, question_text, answer_text,
                    question_type, difficulty, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                q["id"], course_id,
                q["question_text"], q["answer_text"],
                q.get("question_type", "recall"),
                q.get("difficulty", "medium"),
                now,
            )
            self.conn.commit()
            cur.execute("SELECT * FROM questions WHERE id = ?", q["id"])
            created.append(self._serialize(cur, cur.fetchone()))
        return created

    def delete(self, question_id: str, course_id: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "DELETE FROM questions WHERE id = ? AND course_id = ?",
            question_id, course_id,
        )
        self.conn.commit()
        return cur.rowcount > 0
