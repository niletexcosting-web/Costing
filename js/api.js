// Talks to the Google Apps Script backend. text/plain avoids a CORS preflight on GitHub Pages.
const TOKEN_KEY = 'costing_token';
const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
const setToken = t => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function api(action, payload = {}) {
  if (!CONFIG.API_URL || CONFIG.API_URL.startsWith('PASTE')) throw new Error('API URL not set in js/config.js');
  let j;
  try {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: getToken(), ...payload })
    });
    j = await res.json();
  } catch (e) { throw new Error('Cannot reach the server. Check your connection and the API URL.'); }
  if (j.status === 'auth') { clearToken(); if (typeof ME !== 'undefined' && ME) location.reload(); throw new Error(j.error); }
  if (j.status !== 'ok') throw new Error(j.error || 'Server error');
  return j;
}
