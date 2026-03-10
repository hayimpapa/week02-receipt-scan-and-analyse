const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';

export function initGA4() {
  if (!GA4_ID) return;

  // Load gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA4_ID);
}

export function trackEvent(eventName, params = {}) {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}
