/**
 * api.js — Shared API client for all StudyBudy pages.
 *
 * Centralises the backend base URL and auth token logic.
 * To point at a production server, change API_BASE only.
 *
 * Every page that talks to the backend must load this file
 * BEFORE its own JS (e.g. <script src="../../api.js"></script>).
 */

// ── Configuration ─────────────────────────────────────────────────────────────
// Change this single constant to redeploy against any backend.
const API_BASE = "http://127.0.0.1:5000";

// ── Storage keys ──────────────────────────────────────────────────────────────
const TOKEN_KEY = "sb_token";   // bearer token returned by /api/auth/*
const USER_KEY  = "sb_user";    // public user object { firstName, username, … }
// sb_apikey is still stored here — it's the user's own Anthropic key, not ours.

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function getUser() {
  return JSON.parse(localStorage.getItem(USER_KEY) || "null");
}

function saveSession(user, token) {
  localStorage.setItem(USER_KEY,  JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * apiFetch(method, path, body?) → parsed JSON response object
 *
 * Automatically attaches the bearer token.
 * On 401, clears session and redirects to login.html.
 * Throws an Error with .message set to the server's error string on failures.
 */
async function apiFetch(method, path, body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
  };

  if (body !== null) {
    opts.body = JSON.stringify(body);
  }

  let resp;
  try {
    resp = await fetch(`${API_BASE}${path}`, opts);
  } catch (networkErr) {
    // The server is unreachable (not started, wrong port, etc.)
    throw new Error(
      "Cannot reach the StudyBudy server. Make sure backend/app.py is running."
    );
  }

  // 401 = token expired or missing → force re-login
  if (resp.status === 401) {
    clearSession();
    window.location.href = rootPath() + "login.html";
    return;
  }

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(data.error || `HTTP ${resp.status}`);
  }

  return data;
}

/**
 * rootPath() — returns the relative path prefix to reach the project root
 * from wherever the current page lives (handles pages in subdirectories).
 */
function rootPath() {
  // Count how many directories deep we are from index.html
  const parts = window.location.pathname.split("/").filter(Boolean);
  // On Windows file:// URLs the drive letter (C:) appears as the first segment
  const depth = parts.length > 0 ? parts.length - 1 : 0;
  return depth > 0 ? "../".repeat(depth) : "";
}
