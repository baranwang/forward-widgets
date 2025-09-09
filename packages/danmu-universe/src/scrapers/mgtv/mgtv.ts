import { format } from "date-fns";
import { uniqBy } from "es-toolkit";
import { MediaType, searchDanmuParamsSchema } from "../../libs/constants";
import { TTL_1_DAY } from "../../libs/storage";
import { z } from "../../libs/zod";
import { BaseScraper, type ProviderDramaInfo, type ProviderEpisodeInfo } from "../base";
import {
  type MgtvEpisodeInfo,
  mgtvCommentConfigResponseSchema,
  mgtvCommentResponseSchema,
  mgtvEpisodeInfoResponseSchema,
  mgtvIdSchema,
  mgtvSearchResponseSchema,
} from "./schema";

export class MgTVScraper extends BaseScraper<typeof mgtvIdSchema> {
  providerName = "mgtv";

  idSchema = mgtvIdSchema;

  constructor() {
    super();
    this.fetch.setHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.mgtv.com/",
      "Sec-Fetch-Site": "same-site",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
    });
  }

  async search(params: SearchDanmuParams) {
    const { success, data, error } = searchDanmuParamsSchema.safeParse(params);
    if (!success) {
      this.logger.error("搜索参数无效，错误：", z.prettifyError(error));
      return [];
    }
    const { seriesName, season, airDate } = data;
    if (!seriesName) {
      return [];
    }

    const response = await this.fetch.get("https://mobileso.bz.mgtv.com/msite/search/v2", {
      params: {
        q: seriesName,
        pc: 30,
        pn: 1,
        sort: -99,
        ty: 0,
        du: 0,
        pt: 0,
        corr: 1,
        abroad: 0,
        _support: "10000000000000000",
      },
      schema: mgtvSearchResponseSchema,
    });

    if (!response.data?.length) {
      this.logger.warn("搜索结果为空");
      return [];
    }

    const results: ProviderDramaInfo[] = [];

    for (const item of response.data) {
      if (item.mediaType === MediaType.Movie) {
        results.push({
          provider: this.providerName,
          dramaId: item.dramaId,
          dramaTitle: item.title,
          season: 1,
        });
        continue;
      }
      const episodes = await this.getEpisodeInfo(item.dramaId, airDate);
      for (const episode of episodes ?? []) {
        results.push({
          provider: this.providerName,
          dramaId: item.dramaId,
          dramaTitle: episode.t3,
          season: season ?? 1,
        });
      }
    }
    return results;
  }

  async getEpisodes(idString: string, episodeIndex?: number) {
    const mgtvId = this.parseIdString(idString);
    if (!mgtvId) {
      return [];
    }
    const episodes = await this.getEpisodeInfo(mgtvId.dramaId);
    if (!episodes?.length) {
      return [];
    }
    const results = episodes.map<ProviderEpisodeInfo>((ep, index) => ({
      provider: this.providerName,
      episodeId: this.generateIdString({ dramaId: mgtvId.dramaId, videoId: ep.video_id }),
      episodeTitle: ep.t3,
      episodeNumber: this.getEpisodeIndexFromTitle(ep.t2) ?? index + 1,
    }));
    if (episodeIndex) {
      return results.filter((ep) => ep.episodeNumber === episodeIndex);
    }
    return results;
  }

  async getSegments(idString: string) {
    const mgtvId = this.parseIdString(idString);
    if (!mgtvId) {
      return [];
    }
    const episodes = await this.getEpisodeInfo(mgtvId.dramaId);
    if (!episodes?.length) {
      this.logger.warn("没有找到对应的剧集", mgtvId.dramaId);
      return [];
    }

    const ep = episodes.find((ep) => ep.video_id === mgtvId.videoId);
    if (!ep) {
      this.logger.warn("没有找到对应的集数", mgtvId.dramaId, mgtvId.videoId);
      return [];
    }

    return Array.from({ length: Math.ceil(ep.time / 60) }, (_, i) => ({
      provider: this.providerName,
      startTime: i * 60,
      segmentId: i.toString(),
    }));
  }

  async getComments(idString: string, segmentId: string) {
    const mgtvId = this.parseIdString(idString);
    if (!mgtvId) {
      return [];
    }
    // "https://galaxy.bz.mgtv.com/getctlbarrage?version=8.1.39&abroad=0&uuid=&os=10.15.7&platform=0&mac=&vid={vid}&pid=&cid={cid}&ticket="
    const configResp = await this.fetch.get("https://galaxy.bz.mgtv.com/getctlbarrage", {
      params: {
        version: "8.1.39",
        abroad: 0,
        uuid: "",
        os: "10.15.7",
        platform: 0,
        mac: "",
        cid: mgtvId.dramaId,
        vid: mgtvId.videoId,
        pid: "",
        ticket: "",
      },
      schema: mgtvCommentConfigResponseSchema,
      cache: {
        cacheKey: `mgtv:comment_config:${mgtvId.dramaId}_${mgtvId.videoId}`,
        ttl: TTL_1_DAY,
      },
    });

    if (!configResp.data) {
      return [];
    }

    const response = await this.fetch.get(
      `https://${configResp.data?.cdn_list[0]}/${configResp.data?.cdn_version}/${segmentId}.json`,
      {
        schema: mgtvCommentResponseSchema,
      },
    );

    return response.data ?? [];
  }

  private async getEpisodeInfo(dramaId: string, airDate?: string) {
    let month = "";
    try {
      if (airDate) {
        month = format(airDate, "yyyyMM");
      }
    } catch (error) {
      this.logger.warn("Failed to format air date", error);
    }
    const results: MgtvEpisodeInfo[] = [];

    const response = await this.getEpisodeInfoByMonth(dramaId, month);
    results.push(...(response?.data?.list ?? []));

    if (!month && response?.data.tab_m.length) {
      this.logger.warn("没有指定月份，拉取全部月份");
      for (const tab of response?.data.tab_m ?? []) {
        const episodes = await this.getEpisodeInfoByMonth(dramaId, tab.m);
        results.push(...(episodes?.data?.list ?? []));
      }
    }
    return uniqBy(results, (item) => item.video_id);
  }

  private async getEpisodeInfoByMonth(dramaId: string, month: string) {
    const response = await this.fetch.get("https://pcweb.api.mgtv.com/variety/showlist", {
      params: {
        allowedRC: 1,
        collection_id: dramaId,
        month,
        page: 1,
        _support: "10000000",
      },
      schema: mgtvEpisodeInfoResponseSchema,
      cache: `mgtv_episode_info_${dramaId}_${month}`,
      successStatus: [200],
    });

    return response.data;
  }
}
