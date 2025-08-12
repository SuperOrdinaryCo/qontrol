export function getBaseUrl() {
  let baseUrl = window.location.pathname;

  if (new RegExp('/settings').test(baseUrl)) {
    baseUrl = baseUrl.replace(/\/settings/, '');
  }

  if (new RegExp('/queue/').test(baseUrl)) {
    baseUrl = baseUrl.split('/queue/')[0];
  }

  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return baseUrl;
}