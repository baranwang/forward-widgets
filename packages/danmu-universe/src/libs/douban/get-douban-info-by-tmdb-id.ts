import { MediaType } from "../../constants";
import { getExternalIdsByTmdbId } from "../tmdb";
import { getDoubanInfoByImdbId } from "./get-douban-info-by-imdb-id";

/**
 * 通过 TMDB ID 获取豆瓣信息
 */
export const getDoubanInfoByTmdbId = async (type: MediaType, tmdbId: string, season?: number | string) => {
  const externalIds = await getExternalIdsByTmdbId(type, tmdbId);
  console.log("Get external ids by tmdb id", externalIds);
  if (!externalIds.imdb_id) {
    return null;
  }
  return getDoubanInfoByImdbId(externalIds.imdb_id, season);
};

if (import.meta.rstest) {
  const { test, describe, expect } = import.meta.rstest;

  describe("getDoubanInfoByTmdbId", () => {
    test("哪吒之魔童闹海", async () => {
      const response = await getDoubanInfoByTmdbId(MediaType.Movie, "980477");
      expect(response).toHaveProperty("doubanId", "34780991");
    });
  });
}
