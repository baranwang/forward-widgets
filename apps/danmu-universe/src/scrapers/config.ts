import { set } from "es-toolkit/compat";
import type { Simplify, Split, UnionToIntersection } from "type-fest";
import { z } from "../libs/zod";

type FromSegments<Segs extends string[], V> = Segs extends [infer Head extends string, ...infer Rest extends string[]]
  ? { [K in Head]: FromSegments<Rest, V> }
  : V;

export type Unflatten<T extends Record<string, unknown>> = Simplify<
  UnionToIntersection<
    {
      [K in keyof T & string]: FromSegments<Split<K, ".">, T[K]>;
    }[keyof T & string]
  >
>;

export const globalParamsConfigSchema = z
  .object({
    "global.content.aggregation": z.stringbool().catch(true),

    "global.content.blacklist": z
      .string()
      .refine((v) => {
        try {
          new RegExp(v);
          return true;
        } catch {
          return false;
        }
      })
      .catch(""),

    "global.experimental.doubanHistory.enabled": z.stringbool().catch(false),
    "global.experimental.doubanHistory.dbcl2": z.string().catch(""),
    "global.experimental.doubanHistory.customComment": z.string().catch("自豪的使用 Forward"),

    "provider.renren.mode": z.enum(["default", "choice"]).catch("default"),
  })
  .transform((v) => {
    const result = {} as Unflatten<typeof v>;
    Object.entries(v).forEach(([key, value]) => {
      set(result, key, value);
    });
    return result;
  });

export type GlobalParamsConfig = z.infer<typeof globalParamsConfigSchema>;
