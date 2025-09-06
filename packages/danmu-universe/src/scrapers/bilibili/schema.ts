import { compact } from "es-toolkit";
import { z } from "../../libs/zod";

export const bilibiliIdSchema = z.object({
  seasonId: z.string(),
  aid: z.string().optional(),
  cid: z.string().optional(),
});

export type BilibiliId = z.infer<typeof bilibiliIdSchema>;

const pgcEpisodeSchema = z.object({
  aid: z.int(),
  cid: z.int(),
  badge: z.string(),
  duration: z.number(),
  title: z.string(),
  show_title: z.string(),
  long_title: z.string(),
});

export const pgcEpisodeResultSchema = z.object({
  code: z.literal(0),
  result: z.object({
    episodes: z.array(z.unknown().transform((v) => pgcEpisodeSchema.safeParse(v).data)).transform((v) => compact(v)),
  }),
});
