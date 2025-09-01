import parseUrl from "url-parse";
import { z } from "zod";
import { DOUBAN_API_KEY, MediaType } from "../constants";
import { Fetch } from "./fetch";
import { TTL_7_DAYS } from "./storage";
import { getExternalIdsByTmdbId } from "./tmdb";
import type { Douban2VideoPlatformResponse } from "./types";

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
export const getDoubanInfoByTmdbId = async (type: MediaType, tmdbId: string) => {
  const externalIds = await getExternalIdsByTmdbId(type, tmdbId);
  console.log("Get external ids by tmdb id", externalIds);
  if (!externalIds.imdb_id) {
    return null;
  }
  return getDoubanInfoByImdbId(externalIds.imdb_id);
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
  console.log(response.data?.vendors);
  for (const vendor of response.data?.vendors ?? []) {
    if (vendor.is_ad) {
      continue;
    }
    const uriObj = parseUrl(vendor.uri, true);

    switch (vendor.id) {
      case "qq": {
        const { cid } = uriObj.query;
        if (cid) {
          result.providers.tencent = { id: cid };
        }
        break;
      }
      case "iqiyi": {
        const { tvid } = uriObj.query;
        if (tvid) {
          result.providers.iqiyi = { id: tvid };
        }
        break;
      }

      case "youku": {
        const { showid: showId } = uriObj.query;
        if (showId) {
          result.providers.youku = { id: showId };
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
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("getDoubanInfoByImdbId", async () => {
    const response = await getDoubanInfoByImdbId("tt28151918");
    expect(response).toHaveProperty("doubanId", "35651341");
  });

  test("getDoubanInfoByTmdbId", async () => {
    const response = await getDoubanInfoByTmdbId(MediaType.Movie, "980477");
    expect(response).toHaveProperty("doubanId", "34780991");
  });

  test("getVideoPlatformInfoByDoubanId", async () => {
    const response = await getVideoPlatformInfoByDoubanId("34780991");
    expect(response).toBeDefined();
    expect(response.providers).toHaveProperty("tencent", { id: "mzc00200tjkzeps" });
    expect(response.providers).toHaveProperty("youku", { id: "cdee9099d49b4137918b" });
    expect(response.providers).toHaveProperty("iqiyi", { id: "1429158730765200" });
  });
}

//#endregion
