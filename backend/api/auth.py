"""
api/auth.py — Authentication endpoints.

POST /api/auth/signup  — create account, return {user, token}
POST /api/auth/login   — verify credentials, return {user, token}
DELETE /api/auth/logout — invalidate token

Passwords are stored as  salt:sha256(password+salt)  — not plain text.
In production replace with bcrypt; the logic lives only in _hash / _verify
so the swap is a two-line change.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify
import config
from db import get_repos
from api.middleware import require_auth

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ── Password helpers ──────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    """Return 'salt:sha256(password+salt)' — safe to store in the database."""
    salt   = secrets.token_hex(16)          # 32-char hex salt
    digest = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{digest}"

def _verify_password(password: str, stored: str) -> bool:
    """Return True if password matches the stored hash."""
    try:
        salt, digest = stored.split(":", 1)
    except ValueError:
        return False
    return hashlib.sha256((password + salt).encode()).hexdigest() == digest


# ── Token helpers ─────────────────────────────────────────────────────────────

def _new_token() -> str:
    """Generate a cryptographically random 64-char hex bearer token."""
    return secrets.token_hex(32)

def _token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=config.TOKEN_TTL_DAYS)

def _public_user(user: dict) -> dict:
    """Strip sensitive fields before sending the user to the client."""
    return {k: v for k, v in user.items() if k != "password_hash"}


# ── Routes ────────────────────────────────────────────────────────────────────

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}

    required = ["firstName", "lastName", "username", "email",
                "phone", "role", "password"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    users, sessions, _, _ = get_repos()

    try:
        user = users.create(
            first_name    = data["firstName"].strip(),
            last_name     = data["lastName"].strip(),
            username      = data["username"].strip(),
            email         = data["email"].strip().lower(),
            phone         = data["phone"].strip(),
            role          = data["role"],
            password_hash = _hash_password(data["password"]),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409   # 409 Conflict

    token = _new_token()
    sessions.create(user["id"], token, _token_expiry())

    return jsonify({"user": _public_user(user), "token": token}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()
    password   = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "identifier and password are required."}), 400

    users, sessions, _, _ = get_repos()
    user = users.find_by_username_or_email(identifier)

    # Single vague error for wrong username OR wrong password (security best practice)
    if not user or not _verify_password(password, user.get("password_hash", "")):
        return jsonify({"error": "Invalid credentials."}), 401

    token = _new_token()
    sessions.create(user["id"], token, _token_expiry())

    return jsonify({"user": _public_user(user), "token": token}), 200


@auth_bp.route("/logout", methods=["DELETE"])
@require_auth
def logout():
    from flask import g
    _, sessions, _, _ = get_repos()
    sessions.delete(g.token)
    return jsonify({"ok": True}), 200
