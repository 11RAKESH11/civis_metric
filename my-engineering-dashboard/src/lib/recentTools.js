// The last few tools a person opened, with when, kept in this browser only (localStorage).
// Every read and write is wrapped because storage can be blocked or full.
const KEY = 'civismetric-recent-tools';
const TIMES = 'civismetric-recent-times';
const MAX = 6;

export function readRecent() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

// [{ id, at }] newest first; `at` is a millisecond timestamp, or null for entries saved before times were kept.
export function readRecentDetailed() {
  let times = {};
  try { times = JSON.parse(localStorage.getItem(TIMES) || '{}') || {}; } catch { /* ignore */ }
  return readRecent().map((id) => ({ id, at: typeof times[id] === 'number' ? times[id] : null }));
}

export function pushRecent(id) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    let times = {};
    try { times = JSON.parse(localStorage.getItem(TIMES) || '{}') || {}; } catch { /* ignore */ }
    times[id] = Date.now();
    localStorage.setItem(TIMES, JSON.stringify(times));
  } catch { /* storage unavailable */ }
}
