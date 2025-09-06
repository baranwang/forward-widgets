import parseUrl from "url-parse";
import type { BilibiliId } from "../../scrapers/bilibili";
import type { IqiyiId } from "../../scrapers/iqiyi";
import type { TencentId } from "../../scrapers/tencent";
import type { YoukuId } from "../../scrapers/youku";
import { MediaType } from "../constants";
import { fetch } from "../fetch";
import { TTL_7_DAYS } from "../storage";
import { z } from "../zod";

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

if (import.meta.rstest) {
  const { test, describe, expect } = import.meta.rstest;

  test("getVideoPlatformInfoByDoubanId", async () => {
    // const response = await getVideoPlatformInfoByDoubanId("34780991");
    // expect(response).toBeDefined();
    // expect(response.providers).toHaveProperty("tencent", { id: "mzc00200tjkzeps" });
    // expect(response.providers).toHaveProperty("youku", { id: "cdee9099d49b4137918b" });
    // expect(response.providers).toHaveProperty("iqiyi", { id: "1429158730765200" });
  });
}
