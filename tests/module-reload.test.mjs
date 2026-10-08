import test from 'node:test';
import assert from 'node:assert/strict';
import { installModuleReload } from '../src/module-reload.js';

function browser(storage = new Map()) {
  const target = new EventTarget();
  target.sessionStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  target.reloads = 0;
  target.location = { reload: () => target.reloads++ };
  installModuleReload(target);
  return target;
}
function fail(target, message) {
  const event = new Event('vite:preloadError', { cancelable: true });
  event.payload = new TypeError(message);
  target.dispatchEvent(event);
  return event;
}

test('a failed dynamic import reloads once, including after the page restarts', () => {
  const storage = new Map();
  const first = browser(storage);
  assert.equal(fail(first, 'Failed to fetch dynamically imported module: /assets/old.js').defaultPrevented, true);
  assert.equal(first.reloads, 1);
  assert.equal(fail(first, 'Failed to fetch dynamically imported module: /assets/old.js').defaultPrevented, false);
  assert.equal(first.reloads, 1);
  const restarted = browser(storage);
  fail(restarted, 'Failed to fetch dynamically imported module: /assets/old.js');
  assert.equal(restarted.reloads, 0);
});

test('unrelated loading errors do not reload or prevent normal error handling', () => {
  const target = browser();
  assert.equal(fail(target, 'Failed to fetch').defaultPrevented, false);
  assert.equal(target.reloads, 0);
});

test('unavailable session storage does not risk a reload loop', () => {
  const target = browser();
  target.sessionStorage.getItem = () => { throw new Error('Storage blocked'); };
  assert.equal(fail(target, 'Failed to fetch dynamically imported module: /assets/old.js').defaultPrevented, false);
  assert.equal(target.reloads, 0);
});
