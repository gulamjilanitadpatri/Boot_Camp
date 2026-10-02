// ============================================================
// CONFIGURATION AND COMMON FRONTEND HELPERS
// This file contains the API URL, server request helper, status
// messages, and simple browser-session functions used by the app.
// ============================================================

// Paste your deployed Google Apps Script Web App /exec URL here.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0XCFGMX0NcVmAPFcW6rlaueU1PTNOMrsdCAcBPzqB4PsSUxa3dCor2TxaVvvvZzBb/exec";

async function api(action, data = {}) {
  if (!SCRIPT_URL || SCRIPT_URL.includes("PASTE_YOUR")) {
    throw new Error("Add your Google Apps Script /exec URL in config.js");
  }
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: JSON.stringify({action, ...data})
  });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); }
  catch { throw new Error("Server returned an invalid response."); }
  if (!result.success) throw new Error(result.message || "Request failed");
  return result;
}

function setStatus(el, message, type="info") {
  el.textContent = message;
  el.className = `status ${type}`;
}

function saveSession(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getSession(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function clearSession(key) { localStorage.removeItem(key); }
