"""
db/base.py — Abstract repository interfaces.

Every database backend (Access, SQLite, Postgres, …) must implement
these abstract classes.  The Flask routes import ONLY these interfaces
and never touch raw SQL or driver-specific code.

To add a new database:
    1. Create db/<name>.py
    2. Subclass each of these and implement every abstract method
    3. Register the driver in db/__init__.py
    4. Set DB_DRIVER=<name> in config.py
"""

from abc import ABC, abstractmethod
from typing import Optional


# ── User ──────────────────────────────────────────────────────────────────────

class UserRepo(ABC):
    """CRUD operations on the users table."""

    @abstractmethod
    def create(self, first_name: str, last_name: str, username: str,
               email: str, phone: str, role: str, password_hash: str) -> dict:
        """Insert a new user; raise ValueError if username/email already taken."""

    @abstractmethod
    def find_by_id(self, user_id: int) -> Optional[dict]:
        """Return user dict or None."""

    @abstractmethod
    def find_by_username_or_email(self, identifier: str) -> Optional[dict]:
        """Return user dict (including password_hash) or None."""


# ── Session (auth tokens) ─────────────────────────────────────────────────────

class SessionRepo(ABC):
    """Stores bearer tokens that authenticate API requests."""

    @abstractmethod
    def create(self, user_id: int, token: str, expires_at) -> dict:
        """Persist a new token; return the session dict."""

    @abstractmethod
    def find_by_token(self, token: str) -> Optional[dict]:
        """Return session dict (with user_id) or None if expired/missing."""

    @abstractmethod
    def delete(self, token: str) -> bool:
        """Invalidate a token (logout)."""

    @abstractmethod
    def delete_expired(self) -> int:
        """Purge expired sessions; return count deleted."""


# ── Course ────────────────────────────────────────────────────────────────────

class CourseRepo(ABC):
    """CRUD operations on the courses table."""

    @abstractmethod
    def get_by_user(self, user_id: int) -> list:
        """Return all courses belonging to a user, newest first."""

    @abstractmethod
    def get_by_id(self, course_id: str, user_id: int) -> Optional[dict]:
        """Return a single course or None (user_id prevents cross-user access)."""

    @abstractmethod
    def create(self, user_id: int, course_id: str, name: str,
               emoji: str, color: str) -> dict:
        """Insert a new course; return the full course dict."""

    @abstractmethod
    def update_notes(self, course_id: str, user_id: int, notes: str) -> bool:
        """Persist updated notes text; return True on success."""

    @abstractmethod
    def update_summary(self, course_id: str, user_id: int, summary_json: str) -> bool:
        """Persist AI-generated summary as a JSON string; return True on success."""

    @abstractmethod
    def touch_last_studied(self, course_id: str, user_id: int) -> bool:
        """Set last_studied to NOW; return True on success."""

    @abstractmethod
    def delete(self, course_id: str, user_id: int) -> bool:
        """Delete course and cascade-delete its questions; return True on success."""


# ── Question ──────────────────────────────────────────────────────────────────

class QuestionRepo(ABC):
    """CRUD operations on the questions table."""

    @abstractmethod
    def get_by_course(self, course_id: str) -> list:
        """Return all questions for a course, ordered by created_at."""

    @abstractmethod
    def bulk_create(self, course_id: str, questions: list) -> list:
        """
        Insert multiple questions at once.
        Each item in `questions` is a dict with keys:
            id, question_text, answer_text, question_type, difficulty
        Returns the list of created question dicts.
        """

    @abstractmethod
    def delete(self, question_id: str, course_id: str) -> bool:
        """Delete a single question; course_id guards against cross-course deletion."""
