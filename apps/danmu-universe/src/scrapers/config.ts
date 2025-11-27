import Base64 from "crypto-js/enc-base64";
import Utf8 from "crypto-js/enc-utf8";
import { set } from "es-toolkit/compat";
import type { Simplify, Split, UnionToIntersection } from "type-fest";
import { safeJsonParseWithZod } from "../libs/utils";
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

    "global.experimental.trakt.enabled": z.stringbool().catch(false),
    "global.experimental.trakt.token": z
      .string()
      .transform((v) => {
        if (!v) return null;
        return safeJsonParseWithZod(
          Base64.parse(v).toString(Utf8),
          z.object({
            access_token: z.string(),
            expires_at: z.number().min(Date.now()),
          }),
        );
      })
      .catch(null),

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
