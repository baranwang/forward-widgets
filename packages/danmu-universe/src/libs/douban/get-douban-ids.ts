import { z } from "zod";
import type { MediaType } from "../../constants";
import { getExternalIdsByTmdbId } from "../tmdb";
import { getDoubanInfoByImdbId } from "./get-douban-info-by-imdb-id";
import { searchDoubanInfoByName } from "./search-douban-info-by-name";

const getDoubanInfoParamsSchema = z.object({
  tmdbId: z.coerce.string().optional(),
  type: z.enum(["movie", "tv"]).transform((val) => val as MediaType),
  title: z.coerce.string().optional(),
  seriesName: z.coerce.string().optional(),
  season: z.coerce.number().optional(),
  episode: z.coerce.number().optional(),

  fuzzyMatch: z.enum(["always", "never", "auto"]).catch("auto").optional().default("auto"),
});

export const getDoubanIds = async (params: SearchDanmuParams) => {
  const doubanIds = new Set<string>();
  const { tmdbId, type, seriesName, season, fuzzyMatch } = getDoubanInfoParamsSchema.parse(params);
  try {
    const doubanInfo = await getDoubanInfoByTmdbId(type, tmdbId, season);
    if (doubanInfo?.doubanId) {
      doubanIds.add(doubanInfo.doubanId);
    }
  } catch (error) {
    console.error("Error getting douban info by tmdb id", error);
  }

  if (fuzzyMatch === "always" || (fuzzyMatch === "auto" && !doubanIds.size)) {
    try {
      // 搜索豆瓣信息
      let keywords = seriesName;
      if (season && parseInt(season.toString()) > 1) {
        keywords += season.toString();
      }
      const subjects = await searchDoubanInfoByName(keywords);
      for (const subject of subjects) {
        doubanIds.add(subject.target_id);
      }
    } catch (error) {
      console.error("Error searching douban info by name", error);
    }
  }
  return Array.from(doubanIds);
};

/**
 * 通过 TMDB ID 获取豆瓣信息
 */
const getDoubanInfoByTmdbId = async (type: MediaType, tmdbId?: string, season?: number | string) => {
  if (!tmdbId) {
    return null;
  }
  const externalIds = await getExternalIdsByTmdbId(type, tmdbId);
  console.log("Get external ids by tmdb id", externalIds);
  if (!externalIds.imdb_id) {
    return null;
  }
  return getDoubanInfoByImdbId(externalIds.imdb_id, season);
};
