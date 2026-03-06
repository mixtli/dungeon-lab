import deepmerge from '@fastify/deepmerge';

const merger = deepmerge();
/**
 * Deep merge two objects
 */
export function deepMerge(target: object, src: object): object {
  return merger(target, src);
}
