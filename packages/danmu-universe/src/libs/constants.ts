import { z } from "./zod";

export enum MediaType {
  Movie = "movie",
  TV = "tv",
}

export const DEFAULT_COLOR_HEX = "ffffff";
export const DEFAULT_COLOR_INT = parseInt(DEFAULT_COLOR_HEX, 16);

export const PROVIDER_NAMES = {
  tencent: "腾讯视频",
  iqiyi: "爱奇艺",
  youku: "优酷视频",
  bilibili: "哔哩哔哩",
  renren: "人人视频",
  mgtv: "芒果 TV",
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
  airDate: z.coerce.string().optional(),
  episode: z.coerce.number().optional(),
  fuzzyMatch: z.enum(["always", "never", "auto"]).catch("auto").optional().default("auto"),
});

export const EMPTY_ANIME_CONFIG = {
  ID: "__empty__",
  TITLE: "😭 未匹配到资源",
};
