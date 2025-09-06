import AES from "crypto-js/aes";
import Base64 from "crypto-js/enc-base64";
import Utf8 from "crypto-js/enc-utf8";
import HmacSHA256 from "crypto-js/hmac-sha256";
import modeECB from "crypto-js/mode-ecb";
import padPKCS7 from "crypto-js/pad-pkcs7";
import { compact, isNil } from "es-toolkit";
import { z } from "zod";
import { MediaType, searchDanmuParamsSchema } from "../libs/constants";
import type { HttpResponse, RequestOptions } from "../libs/fetch";
import { TTL_1_DAY } from "../libs/storage";
import { generateUUID, safeJsonParseWithZod } from "../libs/utils";
import { BaseScraper, type ProviderCommentItem, type ProviderDramaInfo, type ProviderEpisodeInfo } from "./base";

const AES_KEY = "3b744389882a4067";
const SIGN_SECRET = "ES513W0B1CsdUrR13Qk5EgDAKPeeKZY";
const BASE_API = "https://api.rrmj.plus";
const CLIENT_TYPE = "web_pc";
const CLIENT_VERSION = "1.0.0";

const renrenIdSchema = z.object({
  dramaId: z.coerce.number(),
  episodeId: z.coerce.number().optional(),
});

export type RenRenId = z.infer<typeof renrenIdSchema>;

/**
 * AES ECB PKCS7 解密 Base64 字符串
 */
const aesEcbPkcs7DecryptBase64 = (cipherB64: string) => {
  const raw = Base64.parse(cipherB64);
  const decrypted = AES.decrypt({ ciphertext: raw } as CryptoJS.lib.CipherParams, Utf8.parse(AES_KEY), {
    mode: modeECB,
    padding: padPKCS7,
  });
  return decrypted.toString(Utf8);
};

const aesResponeSchema = z.string().transform((v) => {
  const decrypted = aesEcbPkcs7DecryptBase64(v);
  return safeJsonParseWithZod(
    decrypted,
    z.object({
      data: z.unknown(),
    }),
  );
});

const renrenSearchResponseSchema = z.object({
  searchDramaList: z
    .array(
      z.unknown().transform(
        (v) =>
          z
            .object({
              id: z.string(),
              title: z.string(),
              subtitle: z.string().optional(),
              classify: z.preprocess(
                (v: string) =>
                  ({
                    电影: MediaType.Movie,
                    电视剧: MediaType.TV,
                  })[v] ?? null,
                z.enum(MediaType).nullish().catch(null),
              ),
              name: z.string().optional(),
              year: z.coerce.number().optional(),
            })
            .safeParse(v).data ?? null,
      ),
    )
    .transform((v) => compact(v)),
});

const renrenDramaInfoResponseSchema = z.object({
  dramaInfo: z
    .object({
      dramaId: z.coerce.number(),
      title: z.string(),
      enName: z.string().optional(),
      seasonNo: z.coerce.number().optional(),
    })
    .optional(),
  episodeList: z
    .array(
      z.unknown().transform(
        (v) =>
          z
            .object({
              id: z.coerce.number(),
              episodeNo: z.coerce.number(),
              text: z.string().optional(),
              title: z.string().optional(),
            })
            .safeParse(v).data ?? null,
      ),
    )
    .transform((v) => compact(v)),
});

const renrenCommentItemSchema = z
  .object({
    d: z.string(),
    p: z.string().transform((val) => {
      const parts = val.split(",");
      const timestamp = z.coerce.number().catch(0.0).parse(parts[0]);
      const mode = z.coerce.number().int().catch(1).parse(parts[1]);
      const size = z.coerce.number().int().catch(25).parse(parts[2]);
      const color = z.coerce.number().int().catch(16777215).parse(parts[3]);
      const userId = parts[6] || "";
      const contentId = parts[7] || `${timestamp.toFixed(3)}:${userId}`;
      return { timestamp, mode, size, color, userId, contentId };
    }),
  })
  .transform((v) => {
    const result: ProviderCommentItem = {
      id: v.p.contentId,
      timestamp: v.p.timestamp,
      mode: v.p.mode,
      color: v.p.color,
      content: v.d,
    };
    return result;
  });

export class RenRenScraper extends BaseScraper<typeof renrenIdSchema> {
  providerName = "renren";

  protected idSchema = renrenIdSchema;

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
      console.error("RenRen: Invalid search params", z.prettifyError(error));
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
          console.warn("RenRen: Search parse error", z.prettifyError(result.error), v?.data);
          return [];
        }
        return result.data?.searchDramaList;
      }),
    });

    if (!response.data) {
      return [];
    }
    let results: ProviderDramaInfo[] = [];
    for await (const item of response.data) {
      const title = item.title.replace(/<[^>]+>/g, "").replace(":", "：");

      const dramaInfo = await this.getDramaInfo(item.id);
      if (!dramaInfo) {
        console.log("RenRen: Search", title, "not found");
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
        console.log("RenRen: Search", title, "not match");
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
          console.warn("RenRen: getDramaInfo", dramaId, "parse error", z.prettifyError(result.error), v?.data);
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
    const response = await this.fetch.get(`https://static-dm.rrmj.plus/v1/produce/danmu/EPISODE/${episodeId}`, {
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
