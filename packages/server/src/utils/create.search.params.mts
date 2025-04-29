import { QueryValue } from '@dungeon-lab/shared/types/index.mjs';

export const createSearchParams = (query: Record<string, QueryValue>) => {
  return Object.entries(query).reduce((acc, [key, value]) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = acc;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, QueryValue>;
      }
      current[parts[parts.length - 1]] = value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, QueryValue>);
};
