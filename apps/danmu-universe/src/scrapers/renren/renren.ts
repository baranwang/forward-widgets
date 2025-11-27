import Base64 from "crypto-js/enc-base64";
import HmacSHA256 from "crypto-js/hmac-sha256";
import { compact, isNil } from "es-toolkit";
import { searchDanmuParamsSchema } from "../../libs/constants";
import type { HttpResponse, RequestOptions } from "../../libs/fetch";
import { TTL_1_DAY } from "../../libs/storage";
import { generateUUID } from "../../libs/utils";
import { z } from "../../libs/zod";
import { BaseScraper, type ProviderDramaInfo, type ProviderEpisodeInfo } from "../base";
import {
  aesResponeSchema,
  renrenCommentItemSchema,
  renrenDramaInfoResponseSchema,
  renrenIdSchema,
  renrenSearchResponseSchema,
} from "./schema";

const SIGN_SECRET = "ES513W0B1CsdUrR13Qk5EgDAKPeeKZY";
const BASE_API = "https://api.rrmj.plus";
const CLIENT_TYPE = "web_pc";
const CLIENT_VERSION = "1.0.0";

export class RenRenScraper extends BaseScraper<typeof renrenIdSchema> {
  providerName = "renren";

  idSchema = renrenIdSchema;

  get deviceId() {
    return generateUUID().toUpperCase();
  }

  constructor() {
    super();
    this.fetch.setHeaders({
      "User-Agent": "Mozilla/5.0",
      Origin: "https://rrsp.com.cn",
      Referer: "https://rrsp.com.cn/",
    });
  }

  async search(params: SearchDanmuParams) {
    const { success, data, error } = searchDanmuParamsSchema.safeParse(params);
    if (!success) {
      this.logger.error("搜索参数无效，错误：", z.prettifyError(error));
      return [];
    }
    const { seriesName, season } = data;
    if (!seriesName) {
      return [];
    }

    const response = await this.request("/m-station/search/drama", {
      params: {
        keywords: seriesName,
        size: Math.max(10, season ?? 1),
        order: "match",
        search_after: "",
        isExecuteVipActivity: true,
      },
      cache: {
        cacheKey: `renren:search:${seriesName}`,
        ttl: TTL_1_DAY,
      },
      schema: aesResponeSchema.transform((v) => {
        const result = renrenSearchResponseSchema.safeParse(v?.data);
        if (!result.success) {
          this.logger.warn("搜索解析错误，错误：", z.prettifyError(result.error), v?.data);
          return [];
        }
        return result.data?.searchDramaList;
      }),
    });

    if (!response.data) {
      return [];
    }
    this.logger.info("搜索结果：", response.data);
    let results: ProviderDramaInfo[] = [];
    for await (const item of response.data) {
      const title = item.title.replace(/<[^>]+>/g, "").replace(":", "：");

      const dramaInfo = await this.getDramaInfo(item.id);
      if (!dramaInfo) {
        this.logger.warn("详细信息未找到，title：", title, "id：", item.id);
        continue;
      }

      if (
        !(
          dramaInfo.dramaInfo?.enName?.includes(seriesName) ||
          dramaInfo.dramaInfo?.title?.includes(seriesName) ||
          title.includes(seriesName) ||
          item.name?.includes(seriesName)
        )
      ) {
        this.logger.warn("置信度过低，跳过，title：", title, "id：", item.id);
        continue;
      }

      // 高置信度匹配
      let highConfidenceMatch = false;

      const seasonNo = dramaInfo.dramaInfo?.seasonNo ?? 1;
      if (!isNil(season) && seasonNo === season) {
        highConfidenceMatch = true;
      }
      const providerDramaInfo: ProviderDramaInfo = {
        provider: this.providerName,
        dramaId: item.id,
        dramaTitle: title,
        season: seasonNo,
      };
      results.push(providerDramaInfo);

      if (highConfidenceMatch) {
        this.logger.info("命中高置信度，忽略其他，title：", title, "id：", item.id);
        results = [providerDramaInfo];
        break;
      }
    }
    return results;
  }

  async getEpisodes(idString: string, episodeNumber?: number) {
    const renrenId = this.parseIdString(idString);
    if (!renrenId) {
      return [];
    }
    const dramaInfo = await this.getDramaInfo(renrenId.dramaId.toString());
    if (!dramaInfo) {
      return [];
    }
    const episodes = dramaInfo.episodeList.map<ProviderEpisodeInfo>((ep) => ({
      provider: this.providerName,
      episodeId: this.generateIdString({ dramaId: renrenId.dramaId, episodeId: ep.id }),
      episodeTitle: ep.title || `${dramaInfo.dramaInfo?.title} E${ep.episodeNo}`,
      episodeNumber: ep.episodeNo,
    }));

    if (!isNil(episodeNumber)) {
      return episodes.filter((ep) => ep.episodeNumber === episodeNumber);
    }
    return episodes;
  }

  async getSegments() {
    return [{ provider: this.providerName, segmentId: "1", startTime: 0 }];
  }

  async getComments(idString: string) {
    const renrenId = this.parseIdString(idString);
    if (!renrenId?.episodeId) {
      return [];
    }
    return this.fetchEpisodeDanmu(renrenId.episodeId.toString());
  }

  private async getDramaInfo(dramaId: string) {
    const response = await this.request("/m-station/drama/page", {
      params: {
        hsdrOpen: 0,
        isAgeLimit: 0,
        dramaId,
        hevcOpen: 1,
      },
      schema: aesResponeSchema.transform((v) => {
        const result = renrenDramaInfoResponseSchema.safeParse(v?.data);
        if (!result.success) {
          this.logger.warn("详细信息解析错误，dramaId：", dramaId, "错误：", z.prettifyError(result.error), v?.data);
          return null;
        }
        return result.data;
      }),
      cache: {
        cacheKey: `renren:dramaInfo:${dramaId}`,
        ttl: TTL_1_DAY,
      },
    });

    return response.data;
  }

  private async fetchEpisodeDanmu(episodeId: string) {
    let url = `https://static-dm.rrmj.plus/v1/produce/danmu/EPISODE/${episodeId}`;
    if (this.providerConfig.renren.mode === "choice") {
      url = `https://static-dm.rrmj.plus/v1/produce/danmu/choice/EPISODE/${episodeId}`;
    }
    const response = await this.fetch.get(url, {
      headers: {
        Accept: "application/json",
      },
      schema: z
        .array(z.unknown().transform((v) => renrenCommentItemSchema.safeParse(v).data ?? null))
        .transform((v) => compact(v)),
    });
    return response.data;
  }

  private generateSignature({
    method,
    aliId,
    timestampMs,
    path,
    sortedQuery,
    secret,
  }: {
    method: string;
    aliId: string;
    timestampMs: number;
    path: string;
    sortedQuery: string;
    secret: string;
  }): string {
    const signStr = [
      method.toUpperCase(),
      `aliId:${aliId}`,
      `ct:${CLIENT_TYPE}`,
      `cv:${CLIENT_VERSION}`,
      `t:${timestampMs}`,
      `${path}?${sortedQuery}`,
    ].join("\n");
    const signature = HmacSHA256(signStr, secret);
    return Base64.stringify(signature);
  }

  private generateHeaders({
    method,
    path,
    params,
  }: {
    method: "GET" | "POST";
    path: string;
    params: Record<string, any>;
  }) {
    const sortedQuery = Object.entries(params)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    const now = Date.now();
    const deviceId = this.deviceId;
    const xCaSign = this.generateSignature({
      method,
      aliId: deviceId,
      timestampMs: now,
      path,
      sortedQuery,
      secret: SIGN_SECRET,
    });
    return {
      clientVersion: CLIENT_VERSION,
      deviceId,
      clientType: CLIENT_TYPE,
      t: now.toString(),
      aliId: deviceId,
      umid: deviceId,
      token: "",
      cv: CLIENT_VERSION,
      ct: CLIENT_TYPE,
      uet: "9",
      "x-ca-sign": xCaSign,
      Accept: "application/json",
    };
  }

  private request<T extends z.ZodType>(
    path: string,
    options: RequestOptions<T>,
  ): Promise<HttpResponse<T["_zod"]["output"] | null>>;
  private request<T>(path: string, options: RequestOptions<never>): Promise<HttpResponse<T>>;
  private request<T>(path: string, options: RequestOptions): Promise<HttpResponse<T>> {
    const { params = {}, ...restOptions } = options;
    const headers = this.generateHeaders({ method: "GET", path, params });
    return this.fetch.get<T>(`${BASE_API}${path}`, {
      ...restOptions,
      headers,
      params,
    });
  }
}

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("renren", async () => {
    const scraper = new RenRenScraper();
    const response = await scraper.search({ seriesName: "星期三", season: "1" } as SearchDanmuParams);
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  });
}
