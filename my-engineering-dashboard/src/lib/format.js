// Indian-style money: crore and lakh above a threshold, grouped digits below it.
export function formatMoney(value, currency = '₹') {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}${currency}${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}${currency}${(abs / 1e5).toFixed(2)} L`;
  return `${sign}${currency}${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function timeAgo(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
