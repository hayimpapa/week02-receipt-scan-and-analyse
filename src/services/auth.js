import { getApiBase } from './api';

const TOKEN_KEY = 'owner_session_token';

export function getSessionToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isOwnerMode() {
  return !!sessionStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function loginOwner(password) {
  const response = await fetch(`${getApiBase()}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Login failed');
  }

  const { token } = await response.json();
  sessionStorage.setItem(TOKEN_KEY, token);
  return token;
}
