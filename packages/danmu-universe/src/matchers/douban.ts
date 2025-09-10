import { compact } from "es-toolkit";
import parseUrl from "url-parse";
import { type MediaType, searchDanmuParamsSchema } from "../libs/constants";
import { Fetch } from "../libs/fetch";
import { Logger } from "../libs/logger";
import { TTL_7_DAYS } from "../libs/storage";
import { z } from "../libs/zod";
import { type GetEpisodeParam, scraper } from "../scrapers";
import { ImdbMatcher } from "./imdb";
import { TmdbMatcher } from "./tmdb";

export class DoubanMatcher {
  private logger = new Logger("豆瓣");

  private tmdbMatcher = new TmdbMatcher();

  private imdbMatcher = new ImdbMatcher();

  private fetch = new Fetch();

  private DOUBAN_API_KEY = "0ac44ae016490db2204ce0a042db2916";

  private async getDoubanInfoByImdbId(imdbId: string, season?: number | string) {
    let finalImdbId = imdbId;
    if (season && season.toString() !== "1") {
      // tmdb 和 imdb 不分季，如果是多季的豆瓣一般会用 n 季第一集的 imdbid
      const seasons = await this.imdbMatcher.getImdbSeasons(imdbId);
      if (!seasons || parseInt(season.toString()) > seasons.seasons.length) {
        return null;
      }
      const episodes = await this.imdbMatcher.getImdbEpisodes(imdbId, { season });
      finalImdbId = episodes?.episodes.find((ep) => ep.episodeNumber === 1)?.id ?? "";
    }
    finalImdbId ||= imdbId;

    this.logger.info("通过 imdb id 获取豆瓣信息", finalImdbId);

    const response = await this.fetch.post(
      `https://api.douban.com/v2/movie/imdb/${finalImdbId}`,
      {
        apikey: this.DOUBAN_API_KEY,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        schema: z.object({
          id: z.string(),
          title: z.string().optional(),
        }),
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
  }

  private async getDoubanInfoByTmdbId(type: MediaType, tmdbId?: string, season?: number | string) {
    if (!tmdbId) {
      return null;
    }
    const externalIds = await this.tmdbMatcher.getExternalIds(type, tmdbId);
    this.logger.info("Get external ids by tmdb id", externalIds);
    if (!externalIds.imdb_id) {
      return null;
    }
    return this.getDoubanInfoByImdbId(externalIds.imdb_id, season);
  }

  private async searchDoubanInfoByName(keywords?: string) {
    if (!keywords) {
      return [];
    }
    const response = await this.fetch.get("https://m.douban.com/rexxar/api/v2/search", {
      params: {
        q: keywords,
        start: 0,
        count: 20,
        type: "movie",
      },
      headers: {
        Referer: `https://m.douban.com/movie/`,
        "Content-Type": "application/json",
      },
      schema: z.object({
        subjects: z.object({
          items: z
            .array(
              z.unknown().transform(
                (v) =>
                  z
                    .object({
                      type_name: z.string(),
                      target_type: z.string(),
                      target_id: z.string(),
                      target: z.object({
                        title: z.string(),
                        has_linewatch: z.boolean().refine((val) => val), // 不能播放的取出来也没意义
                      }),
                    })
                    .safeParse(v).data ?? null,
              ),
            )
            .transform((v) => compact(v)),
        }),
      }),
      cache: {
        cacheKey: ["douban", "search", keywords].filter(Boolean).join(":"),
      },
    });
    return response.data?.subjects.items ?? [];
  }

  private async getVideoPlatformInfoByDoubanId(doubanId: string) {
    this.logger.info("获取视频平台信息", doubanId);
    const response = await this.fetch.get(`https://m.douban.com/rexxar/api/v2/movie/${doubanId}?for_mobile=1`, {
      headers: {
        Referer: `https://m.douban.com/movie/subject/${doubanId}/?dt_dapp=1`,
        "Content-Type": "application/json",
      },
      schema: z.object({
        is_tv: z.boolean().optional(),
        vendors: z.array(
          z.unknown().transform((v) => {
            const { success, data, error } = z
              .object({
                id: z.string(),
                is_ad: z
                  .boolean()
                  .catch(false)
                  .refine((val) => !val),
                uri: z.string(),
              })
              .safeParse(v);
            if (!success) {
              this.logger.error("解析视频平台信息失败", z.prettifyError(error), v);
              return null;
            }
            return data;
          }),
        ),
      }),
      successStatus: [200],
      cache: {
        cacheKey: `douban:${doubanId}:info`,
        ttl: TTL_7_DAYS,
      },
    });

    const results: GetEpisodeParam[] = [];

    for (const vendor of response.data?.vendors ?? []) {
      if (!vendor) {
        continue;
      }
      const uriObj = parseUrl(vendor.uri, true);
      switch (vendor.id) {
        case "qq": {
          const { cid, vid } = uriObj.query;
          if (cid) {
            results.push({
              provider: "tencent",
              idString: scraper.scraperMap.tencent.generateIdString({ cid, vid }),
            });
          }
          break;
        }
        case "iqiyi": {
          const { tvid: entityId } = uriObj.query;
          if (entityId) {
            results.push({
              provider: "iqiyi",
              idString: scraper.scraperMap.iqiyi.generateIdString({ entityId }),
            });
          }
          break;
        }
        case "youku": {
          const { showid: showId, vid } = uriObj.query;
          if (showId || vid) {
            results.push({
              provider: "youku",
              idString: scraper.scraperMap.youku.generateIdString({ showId, vid }),
            });
          }
          break;
        }
        case "bilibili": {
          const seasonId = uriObj.pathname.split("/").pop();
          if (seasonId && /\d+/.test(seasonId)) {
            results.push({
              provider: "bilibili",
              idString: scraper.scraperMap.bilibili.generateIdString({ seasonId }),
            });
          }
          break;
        }
      }
    }
    return results;
  }

  private async getDoubanIds(params: SearchDanmuParams) {
    const doubanIds = new Set<string>();
    const { tmdbId, type, seriesName, season, fuzzyMatch } = searchDanmuParamsSchema.parse(params);
    try {
      const doubanInfo = await this.getDoubanInfoByTmdbId(type, tmdbId, season);
      if (doubanInfo?.doubanId) {
        doubanIds.add(doubanInfo.doubanId);
      }
    } catch (error) {
      this.logger.error("Error getting douban info by tmdb id", error);
    }

    if (fuzzyMatch === "always" || (fuzzyMatch === "auto" && !doubanIds.size)) {
      try {
        // 搜索豆瓣信息
        let keywords = seriesName;
        if (season && parseInt(season.toString()) > 1) {
          keywords += season.toString();
        }
        const subjects = await this.searchDoubanInfoByName(keywords);
        for (const subject of subjects) {
          doubanIds.add(subject.target_id);
        }
      } catch (error) {
        this.logger.error("Error searching douban info by name", error);
      }
    }
    return Array.from(doubanIds);
  }

  public async getEpisodeParams(params: SearchDanmuParams) {
    const doubanIds = await this.getDoubanIds(params);
    this.logger.info("获取到豆瓣ID", doubanIds);
    const results: GetEpisodeParam[] = [];
    for (const doubanId of doubanIds) {
      const videoPlatformInfo = await this.getVideoPlatformInfoByDoubanId(doubanId);
      results.push(...videoPlatformInfo);
    }
    this.logger.info("获取到视频平台信息", results);
    return results;
  }
}
