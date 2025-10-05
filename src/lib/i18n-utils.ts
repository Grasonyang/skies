export type MessagesMap = Record<string, string>;

export function flattenMessages(source: unknown, prefix = ''): MessagesMap {
  const result: MessagesMap = {};

  if (!source || typeof source !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      continue;
    }

    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[nextKey] = String(value);
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === null || item === undefined) {
          return;
        }
        const arrayKey = `${nextKey}.${index}`;
        if (
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean'
        ) {
          result[arrayKey] = String(item);
        } else if (typeof item === 'object') {
          Object.assign(result, flattenMessages(item, arrayKey));
        }
      });
      continue;
    }

    if (typeof value === 'object') {
      Object.assign(result, flattenMessages(value, nextKey));
    }
  }

  return result;
}
