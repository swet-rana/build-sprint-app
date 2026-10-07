/** @param {string|null} origin @param {string} siteOrigin @param {string|undefined} appOrigin */
export function isAllowedOrigin(origin, siteOrigin, appOrigin) {
  const allowed = ['http://localhost:5173','http://127.0.0.1:5173',
    'http://localhost:5174','http://127.0.0.1:5174',siteOrigin,appOrigin].filter(Boolean);
  const localPort = origin?.match(/^http:\/\/(?:localhost|127\.0\.0\.1):([0-9]+)$/)?.[1];
  const isPreview = localPort !== undefined && Number(localPort) >= 5173 && Number(localPort) <= 5199;
  return origin === null || isPreview || allowed.includes(origin);
}
