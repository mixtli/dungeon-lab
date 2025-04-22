import { z } from 'zod'

/**
 * Schema for validating character creation form data
 * This only contains fields that are directly used in the form
 * and doesn't duplicate document schemas from the shared types
 */

export function deepPartial<T extends z.ZodTypeAny>(
  schema: T
): z.ZodType<DeepPartial<z.infer<T>>> {
  if (schema instanceof z.ZodObject) {
    const newShape = Object.fromEntries(
      Object.entries(schema.shape).map(([key, value]) => [
        key,
        deepPartial(value as z.ZodTypeAny).optional()
      ])
    );
    return z.object(newShape) as unknown as z.ZodType<DeepPartial<z.infer<T>>>;
  } else if (schema instanceof z.ZodArray) {
    return z.array(deepPartial(schema.element as z.ZodTypeAny)).optional() as unknown as z.ZodType<DeepPartial<z.infer<T>>>;
  } else if (schema instanceof z.ZodEnum) {
    return schema.optional() as unknown as z.ZodType<DeepPartial<z.infer<T>>>;
  } else if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    return schema.optional() as unknown as z.ZodType<DeepPartial<z.infer<T>>>;
  } else if (schema instanceof z.ZodDefault) {
    return deepPartial(schema._def.innerType as z.ZodTypeAny) as unknown as z.ZodType<DeepPartial<z.infer<T>>>;
  }
  return schema.optional() as unknown as z.ZodType<DeepPartial<z.infer<T>>>;
}
// Define the DeepPartial type helper

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;
