import parseUrl from "url-parse";
import { z } from "zod";
import { DOUBAN_API_KEY, MediaType } from "../constants";
import type { BilibiliId } from "../scrapers/bilibili";
import type { IqiyiId } from "../scrapers/iqiyi";
import type { TencentId } from "../scrapers/tencent";
import type { YoukuId } from "../scrapers/youku";
import { Fetch } from "./fetch";
import { getEpisodesByImdbId } from "./imdb";
import { TTL_7_DAYS } from "./storage";
import { getExternalIdsByTmdbId } from "./tmdb";

const fetch = new Fetch();

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
export const getDoubanInfoByImdbId = async (imdbId: string) => {
  const response = await fetch.post(
    `https://api.douban.com/v2/movie/imdb/${imdbId}`,
    {
      apikey: DOUBAN_API_KEY,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      schema: doubanImdbResponseSchema,
      cache: {
        cacheKey: `douban:imdb:${imdbId}`,
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

/**
 * 通过 TMDB ID 获取豆瓣信息
 */
export const getDoubanInfoByTmdbId = async (type: MediaType, tmdbId: string, season?: number | string) => {
  const externalIds = await getExternalIdsByTmdbId(type, tmdbId);
  console.log("Get external ids by tmdb id", externalIds);
  let imdbId = externalIds.imdb_id;
  if (!imdbId) {
    return null;
  }
  if (season && season !== 1) {
    const episodes = await getEpisodesByImdbId(imdbId, { season });
    imdbId = episodes?.episodes.find((ep) => ep.episodeNumber === 1)?.id ?? "";
  }
  if (!imdbId) {
    return null;
  }
  return getDoubanInfoByImdbId(imdbId);
};

const doubanInfoResponseSchema = z.object({
  is_tv: z.boolean().optional(),
  vendors: z.array(
    z.object({
      id: z.string(),
      is_ad: z.boolean().optional(),
      uri: z.string(),
    }),
  ),
});

export interface Douban2VideoPlatformResponse {
  mediaType: MediaType;
  providers: {
    tencent?: TencentId;
    iqiyi?: IqiyiId;
    youku?: YoukuId;
    bilibili?: BilibiliId;
  };
}

/**
 * 通过豆瓣 ID 获取视频平台信息
 */
export const getVideoPlatformInfoByDoubanId = async (doubanId: string) => {
  const response = await fetch.get(`https://m.douban.com/rexxar/api/v2/movie/${doubanId}?for_mobile=1`, {
    headers: {
      Referer: `https://m.douban.com/movie/subject/${doubanId}/?dt_dapp=1`,
      "Content-Type": "application/json",
    },
    schema: doubanInfoResponseSchema,
    cache: {
      cacheKey: `douban:${doubanId}:info`,
      ttl: TTL_7_DAYS,
    },
  });
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get video platform info: ${response.statusCode}, ${JSON.stringify(response.data)}`);
  }

  const result: Douban2VideoPlatformResponse = {
    mediaType: response.data?.is_tv ? MediaType.TV : MediaType.Movie,
    providers: {},
  };
  for (const vendor of response.data?.vendors ?? []) {
    if (vendor.is_ad) {
      continue;
    }
    const uriObj = parseUrl(vendor.uri, true);

    switch (vendor.id) {
      case "qq": {
        const { cid, vid } = uriObj.query;
        if (cid) {
          result.providers.tencent = { cid, vid };
        }
        break;
      }
      case "iqiyi": {
        const { tvid: entityId } = uriObj.query;
        if (entityId) {
          result.providers.iqiyi = { entityId };
        }
        break;
      }

      case "youku": {
        const { showid: showId, vid } = uriObj.query;
        if (showId || vid) {
          result.providers.youku = { showId, vid };
        }
        break;
      }

      case "bilibili": {
        const seasonId = uriObj.pathname.split("/").pop();
        if (seasonId && /\d+/.test(seasonId)) {
          result.providers.bilibili = { seasonId };
        }
        break;
      }

      default:
        break;
    }
  }
  return result;
};

//#region unit tests

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("getDoubanInfoByImdbId", async () => {
    const response = await getDoubanInfoByImdbId("tt28151918");
    expect(response).toHaveProperty("doubanId", "35651341");
  });

  test("getDoubanInfoByTmdbId", async () => {
    const response = await getDoubanInfoByTmdbId(MediaType.Movie, "980477");
    expect(response).toHaveProperty("doubanId", "34780991");
  });

  test("getVideoPlatformInfoByDoubanId", async () => {
    const response = await getVideoPlatformInfoByDoubanId("4922787");
    console.log(response);
    // const response = await getVideoPlatformInfoByDoubanId("34780991");
    // expect(response).toBeDefined();
    // expect(response.providers).toHaveProperty("tencent", { id: "mzc00200tjkzeps" });
    // expect(response.providers).toHaveProperty("youku", { id: "cdee9099d49b4137918b" });
    // expect(response.providers).toHaveProperty("iqiyi", { id: "1429158730765200" });
  });
}

//#endregion
