const API_BASE = '/api';
const SESSION_KEY = 'app_session';

function api(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(r => r.json());
}

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (s) => {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const loginUser = async (username, password) => {
  const result = await api('/login', {
    method: 'POST',
    body: { username, password },
  });
  if (result.success) {
    saveSession(result.session);
  }
  return result;
};

export const registerUser = async (data) => {
  const result = await api('/register', {
    method: 'POST',
    body: data,
  });
  if (result.success) {
    saveSession(result.session);
  }
  return result;
};

export const verifySession = async (token) => {
  return api('/verify-session', {
    method: 'POST',
    body: { token },
  });
};
