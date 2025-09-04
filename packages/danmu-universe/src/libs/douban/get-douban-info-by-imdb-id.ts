import { z } from "zod";
import { fetch } from "../fetch";
import { getImdbEpisodes, getImdbSeasons } from "../imdb";
import { TTL_7_DAYS } from "../storage";
import { DOUBAN_API_KEY } from "./constants";

const doubanImdbResponseSchema = z.object({
  id: z.string(),
  rating: z
    .object({
      min: z.number(),
      max: z.number(),
      average: z.string(),
    })
    .optional(),
  title: z.string().optional(),
  alt_title: z.string().optional(),
  image: z.string().optional(),
  summary: z.string().optional(),
  attrs: z.record(z.string(), z.array(z.string())).optional(),
  mobile_link: z.string().optional(),
  tags: z
    .array(
      z.object({
        count: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
});

/**
 * 通过 IMDB ID 获取豆瓣信息
 */
export const getDoubanInfoByImdbId = async (imdbId: string, season?: number | string) => {
  let finalImdbId = imdbId;
  if (season && season.toString() !== "1") {
    // tmdb 和 imdb 不分季，如果是多季的豆瓣一般会用 n 季第一集的 imdbid
    const seasons = await getImdbSeasons(imdbId);
    if (!seasons || parseInt(season.toString()) > seasons.seasons.length) {
      return null;
    }
    const episodes = await getImdbEpisodes(imdbId, { season });
    finalImdbId = episodes?.episodes.find((ep) => ep.episodeNumber === 1)?.id ?? "";
  }
  finalImdbId ||= imdbId;
  console.log("Get douban info by imdb id", finalImdbId);
  const response = await fetch.post(
    `https://api.douban.com/v2/movie/imdb/${finalImdbId}`,
    {
      apikey: DOUBAN_API_KEY,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      schema: doubanImdbResponseSchema,
      cache: {
        cacheKey: `douban:imdb:${finalImdbId}`,
        ttl: TTL_7_DAYS,
      },
    },
  );

  if (response.statusCode !== 200) {
    throw new Error(`Failed to get Douban info: ${response.statusCode}, ${JSON.stringify(response.data)}`);
  }
  const doubanId = response.data?.id?.split("/")?.pop();
  if (!doubanId) {
    throw new Error(`Failed to extract Douban ID from response: ${response.data?.id}`);
  }
  if (/\d+/.test(doubanId)) {
    return {
      doubanId,
      originResponse: response.data,
    };
  }
  return null;
};

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("getDoubanInfoByImdbId", async () => {
    const response = await getDoubanInfoByImdbId("tt28151918");
    expect(response).toHaveProperty("doubanId", "35651341");
  });
}
