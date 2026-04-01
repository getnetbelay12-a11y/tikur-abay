export function formatText(value: unknown, fallback = 'Not available') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'undefined' || text.toLowerCase() === 'null') return fallback;
  return text;
}

export function formatDateTime(value: unknown, fallback = 'Time not recorded') {
  if (value === null || value === undefined || value === '') return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
}

export function formatLocation(value: unknown, fallback = 'Location not recorded') {
  return formatText(value, fallback);
}

export function formatPerson(value: unknown, fallback = 'System update') {
  return formatText(value, fallback);
}

export function formatPhone(value: unknown, fallback = 'Not available') {
  return formatText(value, fallback);
}
