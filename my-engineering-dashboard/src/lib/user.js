// Who signed in. The login is a demo front door, so this is only the ID or email that was typed,
// kept for the browser session to personalise the greeting. Nothing is sent anywhere.
const KEY = 'civismetric-user';

export const readUser = () => {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
};

export const saveUser = (id) => {
  try { id ? sessionStorage.setItem(KEY, id) : sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
};

// "rakesh.behera@x.in" -> "Rakesh Behera". An ID like "CE-9082" has no name in it, so returns ''.
export function displayName(id) {
  if (!id || !id.includes('@')) return '';
  return id
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

export function initials(id) {
  const name = displayName(id) || id;
  const letters = name.split(/[\s._-]+/).filter(Boolean).map((p) => p[0]);
  return (letters.slice(0, 2).join('') || '?').toUpperCase();
}
