import deepmerge from '@fastify/deepmerge';

const merger = deepmerge();
/**
 * Deep merge two objects
 */
export function deepMerge(target: object, src: object): object {
  return merger(target, src);
}

// export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
//   Object.keys(source).forEach(key => {
//     if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
//       // If property doesn't exist on target, create it
//       if (!target[key] || typeof target[key] !== 'object') {
//         target[key] = {};
//       }
//       deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
//     } else {
//       // Simple property or array, just override
//       target[key] = source[key];
//     }
//   });

//   return target;
// }
