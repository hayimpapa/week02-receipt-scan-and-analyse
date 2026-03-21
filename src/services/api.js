/**
 * Returns the base path for API calls.
 * When accessed via a proxy (e.g. 52-app.com/week02), API calls need
 * the /week02 prefix so they route through the proxy correctly.
 * When accessed directly on Vercel, no prefix is needed.
 */
export function getApiBase() {
  return window.location.pathname.startsWith('/week02') ? '/week02' : '';
}
