"""
api/courses.py — Course CRUD endpoints (all require auth).

GET    /api/courses           list user's courses (includes question count)
POST   /api/courses           create a course
GET    /api/courses/<id>      get one course + its notes
PUT    /api/courses/<id>/notes  save notes text
DELETE /api/courses/<id>      delete course + all its questions
"""

import uuid
from flask import Blueprint, request, jsonify, g
from db import get_repos
from api.middleware import require_auth

courses_bp = Blueprint("courses", __name__, url_prefix="/api/courses")


@courses_bp.route("", methods=["GET"])
@require_auth
def list_courses():
    _, _, course_repo, question_repo = get_repos()
    courses = course_repo.get_by_user(g.user_id)

    # Attach live question count to each course summary
    for c in courses:
        c["question_count"] = len(question_repo.get_by_course(c["id"]))

    return jsonify(courses), 200


@courses_bp.route("", methods=["POST"])
@require_auth
def create_course():
    data = request.get_json(silent=True) or {}

    name  = (data.get("name") or "").strip()
    emoji = (data.get("emoji") or "📚").strip()
    color = (data.get("color") or "purple").strip()

    if not name:
        return jsonify({"error": "name is required."}), 400

    _, _, course_repo, _ = get_repos()
    course = course_repo.create(
        user_id   = g.user_id,
        course_id = str(uuid.uuid4()),
        name      = name,
        emoji     = emoji,
        color     = color,
    )
    course["question_count"] = 0
    return jsonify(course), 201


@courses_bp.route("/<course_id>", methods=["GET"])
@require_auth
def get_course(course_id):
    _, _, course_repo, question_repo = get_repos()
    course = course_repo.get_by_id(course_id, g.user_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404

    course["questions"]      = question_repo.get_by_course(course_id)
    course["question_count"] = len(course["questions"])
    return jsonify(course), 200


@courses_bp.route("/<course_id>/notes", methods=["PUT"])
@require_auth
def update_notes(course_id):
    data  = request.get_json(silent=True) or {}
    notes = data.get("notes", "")

    _, _, course_repo, _ = get_repos()
    ok = course_repo.update_notes(course_id, g.user_id, notes)
    if not ok:
        return jsonify({"error": "Course not found or not yours."}), 404

    return jsonify({"ok": True}), 200


@courses_bp.route("/<course_id>", methods=["DELETE"])
@require_auth
def delete_course(course_id):
    _, _, course_repo, _ = get_repos()
    ok = course_repo.delete(course_id, g.user_id)
    if not ok:
        return jsonify({"error": "Course not found or not yours."}), 404

    return jsonify({"ok": True}), 200
