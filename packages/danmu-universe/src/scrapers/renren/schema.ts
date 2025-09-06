import AES from "crypto-js/aes";
import Base64 from "crypto-js/enc-base64";
import Utf8 from "crypto-js/enc-utf8";
import modeECB from "crypto-js/mode-ecb";
import padPKCS7 from "crypto-js/pad-pkcs7";
import { compact } from "es-toolkit";
import { DEFAULT_COLOR_INT, MediaType } from "../../libs/constants";
import { safeJsonParseWithZod } from "../../libs/utils";
import { z } from "../../libs/zod";
import { providerCommentItemSchema } from "../base";

const AES_KEY = "3b744389882a4067";

export const renrenIdSchema = z.object({
  dramaId: z.coerce.number(),
  episodeId: z.coerce.number().optional(),
});

export type RenRenId = z.infer<typeof renrenIdSchema>;

export const aesResponeSchema = z.string().transform((v) => {
  const raw = Base64.parse(v);
  const decrypted = AES.decrypt({ ciphertext: raw } as CryptoJS.lib.CipherParams, Utf8.parse(AES_KEY), {
    mode: modeECB,
    padding: padPKCS7,
  });
  return safeJsonParseWithZod(
    decrypted.toString(Utf8),
    z.object({
      data: z.unknown(),
    }),
  );
});

export const renrenSearchResponseSchema = z.object({
  searchDramaList: z
    .array(
      z.unknown().transform(
        (v) =>
          z
            .object({
              id: z.string(),
              title: z.string(),
              subtitle: z.string().optional(),
              classify: z.preprocess(
                (v: string) =>
                  ({
                    电影: MediaType.Movie,
                    电视剧: MediaType.TV,
                  })[v] ?? null,
                z.enum(MediaType).nullish().catch(null),
              ),
              name: z.string().optional(),
              year: z.coerce.number().optional(),
            })
            .safeParse(v).data ?? null,
      ),
    )
    .transform((v) => compact(v)),
});

export const renrenDramaInfoResponseSchema = z.object({
  dramaInfo: z
    .object({
      dramaId: z.coerce.number(),
      title: z.string(),
      enName: z.string().optional(),
      seasonNo: z.coerce.number().optional(),
    })
    .optional(),
  episodeList: z
    .array(
      z.unknown().transform(
        (v) =>
          z
            .object({
              id: z.coerce.number(),
              episodeNo: z.coerce.number(),
              text: z.string().optional(),
              title: z.string().optional(),
            })
            .safeParse(v).data ?? null,
      ),
    )
    .transform((v) => compact(v)),
});

export const renrenCommentItemSchema = z
  .object({
    d: z.string(),
    p: z.string().transform((val) => {
      const parts = val.split(",");
      const timestamp = z.coerce.number().catch(0.0).parse(parts[0]);
      const mode = z.coerce.number().int().catch(1).parse(parts[1]);
      // const size = z.coerce.number().int().catch(25).parse(parts[2]);
      const color = z.coerce.number().int().catch(DEFAULT_COLOR_INT).parse(parts[3]);
      const userId = parts[6] || "";
      const contentId = parts[7] || `${timestamp.toFixed(3)}:${userId}`;
      return {
        timestamp,
        mode,
        //  size,
        color,
        userId,
        contentId,
      };
    }),
  })
  .transform((v) => {
    return (
      providerCommentItemSchema.safeParse({
        id: v.p.contentId,
        timestamp: v.p.timestamp,
        mode: v.p.mode,
        color: v.p.color,
        content: v.d,
      }).data ?? null
    );
  });
