export const toArray = <T,>(value: unknown): T[] => Array.isArray(value) ? (value as T[]) : [];

export const toObject = <T extends Record<string, unknown>>(value: unknown, fallback: T): T => (
  value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : fallback
);

export const toStringValue = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value.trim() || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
};

export const toNumberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const toBooleanValue = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};
