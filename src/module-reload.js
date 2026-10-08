const RELOAD_KEY = 'healthstats-dynamic-import-reloaded';

export function installModuleReload(target = window) {
  target.addEventListener('vite:preloadError', event => {
    if (!event.payload?.message?.includes('Failed to fetch dynamically imported module')) return;
    try {
      if (target.sessionStorage.getItem(RELOAD_KEY)) return;
      target.sessionStorage.setItem(RELOAD_KEY, 'true');
    } catch {
      return;
    }
    event.preventDefault();
    target.location.reload();
  });
}
