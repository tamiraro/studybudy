"""
api/middleware.py — Auth helpers used by every protected route.

require_auth(f) — decorator that:
    1. Reads the "Authorization: Bearer <token>" header.
    2. Looks up the token in the sessions table.
    3. Attaches (user_id, session) to Flask's g context.
    4. Returns 401 if the token is missing or expired.

The routes never touch localStorage — they only see the bearer token.
"""

import functools
from flask import request, jsonify, g
from db import get_repos


def require_auth(f):
    """Decorator: verify bearer token and attach user_id to g."""
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header."}), 401

        token = auth_header[len("Bearer "):]
        _, sessions, _, _ = get_repos()
        session = sessions.find_by_token(token)

        if not session:
            return jsonify({"error": "Token expired or invalid. Please log in again."}), 401

        # Attach to Flask request context so route functions can read them
        g.user_id = session["user_id"]
        g.token   = token
        return f(*args, **kwargs)

    return wrapper
