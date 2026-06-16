"""
app.py — Flask application entry point.

Start the server:
    python app.py

The frontend (file:// protocol) needs CORS — flask-cors allows it.
In production behind a real domain, tighten CORS to that domain only:
    CORS(app, origins=["https://yourdomain.com"])
"""

import sys
import os

# Ensure backend/ is on the Python path so 'from db import ...' works
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify
from flask_cors import CORS

import config
from api.auth      import auth_bp
from api.courses   import courses_bp
from api.questions import questions_bp

# ── App factory ───────────────────────────────────────────────────────────────

app = Flask(__name__)
app.secret_key = config.SECRET_KEY

# Allow requests from file:// and any localhost origin during development.
# Change origins to your production domain before deploying.
CORS(app, resources={r"/api/*": {"origins": "*"}},
     supports_credentials=True)

# ── Register blueprints ───────────────────────────────────────────────────────

app.register_blueprint(auth_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(questions_bp)

# ── Health check ──────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    """Simple liveness probe — confirms the server is reachable."""
    return jsonify({"status": "ok", "db": config.DB_DRIVER}), 200

# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed."}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error.", "detail": str(e)}), 500

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"StudyBudy API  →  http://{config.HOST}:{config.PORT}")
    print(f"Database driver: {config.DB_DRIVER}")
    print(f"Database path:   {config.DB_PATH}")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
