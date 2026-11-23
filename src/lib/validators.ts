import { z } from 'zod';

/** Helpers to validate FormData with zod. Empty strings become undefined. */
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);

export const str = (max = 255) => z.string().trim().min(1, 'is required').max(max);
export const optStr = (max = 5000) => z.preprocess(blank, z.string().trim().max(max).optional());
export const int = (min?: number, max?: number) => {
  let s = z.coerce.number().int('must be a whole number');
  if (min !== undefined) s = s.min(min);
  if (max !== undefined) s = s.max(max);
  return s;
};
export const num = (min?: number, max?: number) => {
  let s = z.coerce.number();
  if (min !== undefined) s = s.min(min);
  if (max !== undefined) s = s.max(max);
  return s;
};
export const optInt = (min?: number, max?: number) => z.preprocess(blank, int(min, max).optional());
export const optNum = (min?: number, max?: number) => z.preprocess(blank, num(min, max).optional());
export const date = () => z.preprocess(blank, z.coerce.date({ message: 'must be a valid date' }));
export const optDate = () => z.preprocess(blank, z.coerce.date().optional());
export const email = () => z.string().trim().email('must be a valid email');
export const optEmail = () => z.preprocess(blank, z.string().trim().email('must be a valid email').optional());
export const oneOf = <T extends readonly [string, ...string[]]>(vals: T) => z.enum(vals);
export const bool = () => z.preprocess((v) => v === 'on' || v === 'true' || v === '1' || v === true, z.boolean());

export function formObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') o[k] = v;
  return o;
}
export function parse<S extends z.ZodTypeAny>(schema: S, fd: FormData): z.infer<S> {
  return schema.parse(formObject(fd));
}
