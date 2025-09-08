import { compact } from "es-toolkit";
import parseUrl from "url-parse";
import { type GetEpisodeParam, scraper } from "../../scrapers";
import { MediaType, searchDanmuParamsSchema } from "../constants";
import { fetch } from "../fetch";
import { z } from "../zod";
import { BASE_API } from "./constants";

export const qihooSearchResponseSchema = z
  .object({
    data: z.object({
      longData: z.object({
        rows: z
          .array(
            z.unknown().transform(
              (v) =>
                z
                  .object({
                    cat_id: z.enum(["1", "2", "3", "4"]),
                    id: z.string(),
                    en_id: z.string(),
                    cat_name: z.string(),
                    titleTxt: z.string(),
                    playlinks: z.record(z.string(), z.string()).optional(),
                  })
                  .safeParse(v).data ?? null,
            ),
          )
          .transform((v) => compact(v)),
      }),
    }),
  })
  .transform((v) => v.data.longData.rows);

export const searchVideoPlatformInfoWith360kan = async (params: SearchDanmuParams) => {
  const { success, data, error } = searchDanmuParamsSchema.safeParse(params);
  if (!success) {
    console.error("[360] 搜索参数无效，错误：", z.prettifyError(error));
    return [];
  }
  const { seriesName, season, type: mediaType, episode: episodeNumber } = data;
  if (!seriesName) {
    return [];
  }

  const response = await fetch.get(`${BASE_API}/index`, {
    params: {
      force_v: "1",
      kw: `${seriesName} ${season && season > 1 ? season : ""}`.trim(),
      from: "",
      pageno: "1",
      v_ap: "1",
      tab: "all",
    },
    schema: qihooSearchResponseSchema,
  });

  if (!response.data?.length) {
    return [];
  }

  const results: GetEpisodeParam[] = [];

  for (const item of response.data) {
    if (mediaType === MediaType.Movie && item.cat_id !== "1") {
      console.warn("[360] 电影搜索结果中包含电视剧，跳过");
      continue;
    }
    if (mediaType === MediaType.TV && item.cat_id === "1") {
      console.warn("[360] 电视剧搜索结果中包含电影，跳过");
      continue;
    }
    if (!item.titleTxt.includes(seriesName)) {
      console.warn("[360] 搜索结果中包含的剧集标题与搜索关键词不匹配，跳过");
      continue;
    }
    if (!item.playlinks) {
      console.warn("[360] 搜索结果中包含的剧集没有播放链接，跳过");
      continue;
    }

    if (item.playlinks.qq) {
      const cid = item.playlinks.qq.match(/\/cover\/([^/]+?)(\/|.html|$)/)?.[1];
      if (cid) {
        results.push({
          provider: "tencent",
          idString: scraper.scraperMap.tencent.generateIdString({ cid }),
          episodeNumber,
        });
      }
    }

    if (item.playlinks.youku) {
      const urlObj = parseUrl(item.playlinks.youku, true);
      const { vid, showid: showId } = urlObj.query;
      if (vid || showId) {
        results.push({
          provider: "youku",
          idString: scraper.scraperMap.youku.generateIdString({ vid, showId }),
          episodeNumber,
        });
      }
    }

    if (item.playlinks.qiyi) {
      const videoId = item.playlinks.qiyi.match(/\/v_([^/]+?)(\/|.html|$)/)?.[1];
      const entityId = videoId ? scraper.scraperMap.iqiyi.videoIdToEntityId(videoId) : undefined;
      if (entityId) {
        results.push({
          provider: "iqiyi",
          idString: scraper.scraperMap.iqiyi.generateIdString({ entityId }),
          episodeNumber,
        });
      }
    }

    if (item.playlinks.bilibili1) {
      const resp = await fetch.get<string>(item.playlinks.bilibili1, { cache: item.playlinks.bilibili1 });
      const html = resp.data;
      const seasonId = html.match(/"season_id":(\d+)/)?.[1];
      if (seasonId) {
        results.push({
          provider: "bilibili",
          idString: scraper.scraperMap.bilibili.generateIdString({ seasonId }),
          episodeNumber,
        });
      }
    }

    if (item.playlinks.imgo) {
      const dramaId = item.playlinks.imgo.match(/\/b\/([^/]+)\//)?.[1];
      if (dramaId) {
        results.push({
          provider: "mgtv",
          idString: scraper.scraperMap.mgtv.generateIdString({ dramaId }),
          episodeNumber,
        });
      }
    }
  }

  return results;
};

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("360", async () => {
    const response = await searchVideoPlatformInfoWith360kan({
      seriesName: "庆余年",
      season: "1",
    } as SearchDanmuParams);
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  });
}
