import parseUrl from "url-parse";
import { DOUBAN_API_KEY, MediaType, VideoPlatform } from "../constants";
import { getExternalIdsByTmdbId } from "./tmdb";
import type { Douban2VideoPlatformResponse } from "./types";

/**
 * 通过 IMDB ID 获取豆瓣信息
 */
export const getDoubanInfoByImdbId = async (imdbId: string) => {
  const response = await Widget.http.post<{
    id: string;
    rating: {
      min: number;
      max: number;
      average: `${number}`;
      numRaters: number;
    };
    title: string;
    alt_title: string;
    image: string;
    summary: string;
    attrs: Record<string, string[]>;
    mobile_link: string;
    tags: {
      count: number;
      name: string;
    }[];
  }>(
    `https://api.douban.com/v2/movie/imdb/${imdbId}`,
    {
      apikey: DOUBAN_API_KEY,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get Douban info: ${response.statusCode}, ${JSON.stringify(response.data)}`);
  }
  const doubanId = response.data?.id?.split("/")?.pop();
  if (!doubanId) {
    throw new Error(`Failed to extract Douban ID from response: ${response.data.id}`);
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

/**
 * 通过豆瓣 ID 获取视频平台信息
 */
export const getVideoPlatformInfoByDoubanId = async (doubanId: string) => {
  const response = await Widget.http.get<{
    is_tv: boolean;
    vendors: {
      id: VideoPlatform;
      is_ad: boolean;
      uri: string;
    }[];
  }>(`https://m.douban.com/rexxar/api/v2/movie/${doubanId}?for_mobile=1`, {
    headers: {
      Referer: `https://m.douban.com/movie/subject/${doubanId}/?dt_dapp=1`,
      "Content-Type": "application/json",
    },
  });
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get video platform info: ${response.statusCode}, ${JSON.stringify(response.data)}`);
  }
  const result: Douban2VideoPlatformResponse = {
    mediaType: response.data.is_tv ? MediaType.TV : MediaType.Movie,
  };
  for (const vendor of response.data.vendors) {
    if (vendor.is_ad) {
      continue;
    }
    const uriObj = parseUrl(vendor.uri, true);

    switch (vendor.id) {
      case VideoPlatform.腾讯视频: {
        const { cid } = uriObj.query;
        if (cid) {
          result.qq = { cid };
        }
        break;
      }
      case VideoPlatform.爱奇艺: {
        const { aid, vid } = uriObj.query;
        if (aid && vid) {
          result.iqiyi = { aid, vid };
        }
        break;
      }

      case VideoPlatform.优酷: {
        const { showid: showId } = uriObj.query;
        if (showId) {
          result.youku = { showId };
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
}

//#endregion
