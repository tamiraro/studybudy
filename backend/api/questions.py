"""
api/questions.py — Question CRUD endpoints (all require auth).

GET    /api/courses/<course_id>/questions        list questions for a course
POST   /api/courses/<course_id>/questions        bulk-add questions (AI-generated)
DELETE /api/courses/<course_id>/questions/<qid>  delete one question
"""

import uuid
from flask import Blueprint, request, jsonify, g
from db import get_repos
from api.middleware import require_auth

questions_bp = Blueprint("questions", __name__)

VALID_TYPES       = {"recall", "conceptual", "application"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


@questions_bp.route("/api/courses/<course_id>/questions", methods=["GET"])
@require_auth
def list_questions(course_id):
    _, _, course_repo, question_repo = get_repos()

    # Verify the course belongs to this user
    if not course_repo.get_by_id(course_id, g.user_id):
        return jsonify({"error": "Course not found."}), 404

    questions = question_repo.get_by_course(course_id)
    return jsonify(questions), 200


@questions_bp.route("/api/courses/<course_id>/questions", methods=["POST"])
@require_auth
def add_questions(course_id):
    _, _, course_repo, question_repo = get_repos()

    if not course_repo.get_by_id(course_id, g.user_id):
        return jsonify({"error": "Course not found."}), 404

    body = request.get_json(silent=True) or {}
    items = body.get("questions", [])

    if not isinstance(items, list) or not items:
        return jsonify({"error": "questions must be a non-empty array."}), 400

    # Validate and normalise each question before writing to the database
    cleaned = []
    for i, q in enumerate(items):
        qt = (q.get("question") or q.get("question_text") or "").strip()
        at = (q.get("answer")   or q.get("answer_text")   or "").strip()
        if not qt or not at:
            return jsonify({"error": f"questions[{i}] missing question or answer."}), 400

        qtype = q.get("type") or q.get("question_type") or "recall"
        if qtype not in VALID_TYPES:
            qtype = "recall"

        difficulty = q.get("difficulty") or "medium"
        if difficulty not in VALID_DIFFICULTIES:
            difficulty = "medium"

        cleaned.append({
            "id":            str(uuid.uuid4()),
            "question_text": qt,
            "answer_text":   at,
            "question_type": qtype,
            "difficulty":    difficulty,
        })

    # Update last_studied timestamp when questions are added
    course_repo.touch_last_studied(course_id, g.user_id)
    created = question_repo.bulk_create(course_id, cleaned)
    return jsonify(created), 201


@questions_bp.route("/api/courses/<course_id>/questions/<question_id>", methods=["DELETE"])
@require_auth
def delete_question(course_id, question_id):
    _, _, course_repo, question_repo = get_repos()

    if not course_repo.get_by_id(course_id, g.user_id):
        return jsonify({"error": "Course not found."}), 404

    ok = question_repo.delete(question_id, course_id)
    if not ok:
        return jsonify({"error": "Question not found."}), 404

    return jsonify({"ok": True}), 200
