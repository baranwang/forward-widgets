import { z } from "zod";

export enum MediaType {
  Movie = "movie",
  TV = "tv",
}

export const DEFAULT_COLOR_HEX = "ffffff";
export const DEFAULT_COLOR_INT = parseInt(DEFAULT_COLOR_HEX, 16);

export const PROVIDER_NAMES: Record<string, string> = {
  tencent: "腾讯视频",
  iqiyi: "爱奇艺",
  youku: "优酷视频",
  bilibili: "哔哩哔哩",
  renren: "人人视频",
};

export const searchDanmuParamsSchema = z.object({
  tmdbId: z.coerce.string().optional(),
  type: z
    .enum(["movie", "tv"])
    .transform((val) => val as MediaType)
    .catch(MediaType.Movie),
  title: z.coerce.string().optional(),
  seriesName: z.coerce.string().optional(),
  season: z.coerce.number().optional(),
  episode: z.coerce.number().optional(),
  fuzzyMatch: z.enum(["always", "never", "auto"]).catch("auto").optional().default("auto"),
});
