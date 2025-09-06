import Base64 from "crypto-js/enc-base64";
import Utf8 from "crypto-js/enc-utf8";
import MD5 from "crypto-js/md5";
import { qs } from "url-parse";
import { z } from "zod";
import { DEFAULT_COLOR_INT } from "../libs/constants";
import { safeJsonParseWithZod } from "../libs/utils";
import { BaseScraper, CommentMode, type ProviderEpisodeInfo, providerCommentItemSchema } from "./base";

const youkuIdSchema = z.object({
  showId: z.string().optional(),
  vid: z.string().optional(),
});

export type YoukuId = z.infer<typeof youkuIdSchema>;

const youkuEpisodeInfoSchema = z
  .object({
    id: z.string(),
    show_id: z.string().optional(),
    title: z.string(),
    seq: z.coerce.number().optional(),
    duration: z.string(),
    category: z.string(),
    link: z.string(),
  })
  .transform((data) => {
    return {
      ...data,
      get totalMat(): number {
        try {
          const durationFloat = parseFloat(data.duration);
          return Math.floor(durationFloat / 60) + 1;
        } catch {
          return 0;
        }
      },
    };
  });

const youkuVideoResultSchema = z.object({
  total: z.number().or(z.string().transform((v) => parseInt(v))),
  videos: z.array(youkuEpisodeInfoSchema),
});

const youkuCommentSchema = z
  .object({
    id: z.number(),
    content: z.string(),
    playat: z.number().transform((v) => v / 1000), // milliseconds
    propertis: z
      .string()
      .nullish()
      .transform((v) =>
        safeJsonParseWithZod(
          v ?? "{}",
          z.object({
            color: z.number().optional().default(DEFAULT_COLOR_INT),
            pos: z
              .number()
              .optional()
              .transform((v) => {
                let mode = CommentMode.SCROLL;
                if (v === 1) mode = CommentMode.TOP;
                else if (v === 2) mode = CommentMode.BOTTOM;
                return mode;
              }),
          }),
        ),
      ),
  })
  .transform((v) => {
    return (
      providerCommentItemSchema.safeParse({
        id: v.id.toString(),
        timestamp: v.playat,
        mode: v.propertis?.pos,
        color: v.propertis?.color,
        content: v.content,
      }).data ?? null
    );
  });

const youkuDanmuResultSchema = z.object({
  data: z.object({
    result: z.array(youkuCommentSchema),
  }),
});

// 移除未使用的类型别名，避免 Lint 警告

export class YoukuScraper extends BaseScraper<typeof youkuIdSchema> {
  providerName = "youku";

  protected idSchema = youkuIdSchema;

  private readonly EPISODE_BLACKLIST_KEYWORDS = ["彩蛋", "加更", "走心", "解忧", "纯享"];

  constructor() {
    super();
    this.fetch.setHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
  }

  private get token() {
    const tokenValue = this.fetch.getCookie("_m_h5_tk")?.split("_")[0] ?? "";
    // C# 版本只使用前32个字符用于签名计算
    return tokenValue.substring(0, 32);
  }
  private get cna() {
    return this.fetch.getCookie("cna") ?? "";
  }

  async getEpisodes(idString: string, episodeNumber?: number) {
    const youkuId = this.parseIdString(idString);
    if (!youkuId) {
      return [];
    }
    let showId = youkuId.showId;
    if (!showId && youkuId.vid) {
      const videoInfo = await this.getVideoInfo(youkuId.vid);
      showId = videoInfo?.show_id ?? "";
    }
    if (!showId) {
      return [];
    }

    const pageSize = 20;
    const targetEpisode = episodeNumber ?? 1;
    const targetPage = Math.max(1, Math.ceil(targetEpisode / pageSize));

    try {
      // 辅助函数：过滤黑名单视频
      const filterBlacklisted = <T extends { title: string }>(videos: T[]): T[] =>
        videos.filter((video) => !this.EPISODE_BLACKLIST_KEYWORDS.some((keyword) => video.title.includes(keyword)));

      // 辅助函数：创建 ProviderEpisodeInfo 对象
      const createEpisodeInfo = (
        video: { id: string; title: string; seq?: number },
        episodeNum: number,
      ): ProviderEpisodeInfo => ({
        provider: this.providerName,
        episodeId: this.generateIdString({ showId, vid: video.id }),
        episodeTitle: video.title,
        episodeNumber: episodeNum,
      });

      // 步骤1：获取目标页数据
      const firstPage = await this.getEpisodesPage(showId, targetPage, pageSize);
      const firstVideos = filterBlacklisted(firstPage?.videos ?? []);

      // 步骤2：检查目标页是否包含目标集数
      const matchedInFirst = firstVideos.find((v) => v.seq === targetEpisode);
      if (matchedInFirst) {
        return [createEpisodeInfo(matchedInFirst, targetEpisode)];
      }

      // 步骤3：计算需要获取的其他页码
      const total = Number(firstPage?.total ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const remainingPages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p !== targetPage);

      // 步骤4：串行获取剩余页数据（避免QPS限制）
      const remainingResults = [];
      for (const page of remainingPages) {
        await this.sleep(500); // 500ms延时避免QPS限制
        const result = await this.getEpisodesPage(showId, page, pageSize);
        remainingResults.push(result);
      }

      // 步骤5：合并并过滤所有视频
      const remainingVideos = filterBlacklisted(remainingResults.flatMap((res) => res?.videos ?? []));
      const allVideos = [...firstVideos, ...remainingVideos];

      // 步骤6：处理返回结果
      if (episodeNumber !== undefined) {
        // 指定了集数：查找并返回单集
        const matched = allVideos.find((v) => v.seq === targetEpisode);
        return matched ? [createEpisodeInfo(matched, targetEpisode)] : [];
      }

      // 未指定集数：返回所有集数（按seq排序）
      const sortedVideos = allVideos.sort(
        (a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER),
      );
      return sortedVideos.map((video, index) => createEpisodeInfo(video, index + 1));
    } catch (error) {
      this.logger.error("获取分集失败，showId：", showId, "错误：", error);
      return [];
    }
  }

  async getSegments(idString: string) {
    const { vid } = this.parseIdString(idString) ?? {};
    if (!vid) {
      return [];
    }

    try {
      // 确保token和cookie已设置
      await this.ensureTokenCookie();
      const episodeInfo = await this.getVideoInfo(vid);
      if (!episodeInfo) {
        this.logger.warn("获取分集信息失败，vid：", vid);
        return [];
      }

      const totalMat = episodeInfo.totalMat;

      if (totalMat === 0) {
        this.logger.warn("视频时长为0，无法获取弹幕，vid：", vid);
        return [];
      }

      return Array.from({ length: totalMat }, (_, i) => ({
        provider: this.providerName,
        startTime: i * 60,
        segmentId: i.toString(),
      }));
    } catch (error) {
      this.logger.error("获取分段信息失败，vid：", vid, "错误：", error);
      return [];
    }
  }

  async getComments(idString: string, segmentId: string) {
    const { vid } = this.parseIdString(idString) ?? {};
    if (!vid) {
      return [];
    }
    try {
      // 确保token和cookie已设置
      await this.ensureTokenCookie();

      return this.getDanmuContentByMat(vid, parseInt(segmentId, 10));
    } catch (error) {
      this.logger.error("获取弹幕信息失败，vid：", vid, "错误：", error);
      return [];
    }
  }

  private async getVideoInfo(vid: string) {
    const response = await this.fetch.get("https://openapi.youku.com/v2/videos/show_basic.json", {
      params: {
        client_id: "53e6cc67237fc59a",
        package: "com.huawei.hwvplayer.youku",
        video_id: vid,
      },
      schema: youkuEpisodeInfoSchema,
      cache: {
        cacheKey: `youku:segments:${vid}`,
      },
    });
    return response.data;
  }

  private async getEpisodesPage(showId: string, page: number, pageSize: number) {
    const response = await this.fetch.get("https://openapi.youku.com/v2/shows/videos.json", {
      params: {
        client_id: "53e6cc67237fc59a",
        package: "com.huawei.hwvplayer.youku",
        ext: "show",
        show_id: showId,
        page: page.toString(),
        count: pageSize.toString(),
      },
      schema: youkuVideoResultSchema,
      cache: {
        cacheKey: `youku:episodes:${showId}:${page}:${pageSize}`,
      },
    });
    return response.data;
  }

  private async getDanmuContentByMat(vid: string, mat: number) {
    if (!this.token) {
      this.logger.error("无法获取弹幕，_m_h5_tk 缺失");
      return [];
    }

    const msg: Record<string, string | number> = {
      pid: 0,
      ctype: 10004,
      sver: "3.1.0",
      cver: "v1.0",
      ctime: Date.now(),
      guid: this.cna,
      vid: vid,
      mat: mat,
      mcount: 1,
      type: 1,
    };

    const msgOrderedStr = JSON.stringify(Object.fromEntries(Object.entries(msg).sort()));
    const msgEnc = Base64.stringify(Utf8.parse(msgOrderedStr));

    msg.msg = msgEnc;
    msg.sign = this.generateMsgSign(msgEnc);

    const appKey = "24679788";
    const dataPayload = JSON.stringify(msg);
    const t = Date.now().toString();

    try {
      const response = await this.fetch.post(
        "https://acs.youku.com/h5/mopen.youku.danmu.list/1.0/",
        qs.stringify({ data: dataPayload }),
        {
          params: {
            jsv: "2.7.0",
            appKey: appKey,
            t,
            sign: this.generateTokenSign(t, appKey, dataPayload),
            api: "mopen.youku.danmu.list",
            v: "1.0",
            type: "originaljson",
            dataType: "jsonp",
            timeout: "20000",
            jsonpIncPrefix: "utility",
          },
          headers: { Referer: "https://v.youku.com", "Content-Type": "application/x-www-form-urlencoded" },
          successStatus: [200],
          schema: z.looseObject({
            data: z.object({
              result: z
                .string()
                .transform((v) => safeJsonParseWithZod(v, youkuDanmuResultSchema))
                .optional(),
            }),
          }),
        },
      );

      const result = response.data?.data.result?.data.result ?? [];
      this.logger.info("获取到分段", mat, "的弹幕", result.length, "条");

      return result;
    } catch (error) {
      this.logger.error("解析弹幕响应失败，vid：", vid, "mat：", mat, "错误：", error);
      return [];
    }
  }

  private generateMsgSign(msgEnc: string) {
    return MD5(`${msgEnc}MkmC9SoIw6xCkSKHhJ7b5D2r51kBiREr`).toString().toLowerCase();
  }

  private generateTokenSign(t: string, appKey: string, dataPayload: string) {
    return MD5([this.token, t, appKey, dataPayload].join("&")).toString().toLowerCase();
  }

  /**
   * 确保获取弹幕签名所需的 cna 和 _m_h5_tk cookie。
   * 此逻辑严格参考了 Python 代码，并针对网络环境进行了优化。
   */
  private async ensureTokenCookie() {
    this.fetch.cookie = {};

    // 步骤 1: 获取 'cna' cookie。它通常由优酷主站或其统计服务设置。
    try {
      await this.fetch.get("https://log.mmstat.com/eg.js", {
        headers: {
          Cookie: "",
          "If-None-Match": "",
        },
      });
    } catch (error) {
      this.logger.warn("无法连接到 youku.com 获取 'cna' cookie。错误：", error);
    }

    // 步骤 2: 获取 '_m_h5_tk' 令牌, 此请求可能依赖于 'cna' cookie 的存在。
    try {
      await this.fetch.get("https://acs.youku.com/h5/mtop.com.youku.aplatform.weakget/1.0/?jsv=2.5.1&appKey=24679788");
    } catch (error) {
      this.logger.error("无法连接到 acs.youku.com 获取令牌 cookie。弹幕获取很可能会失败。错误：", error);
    }

    if (!this.cna || !this.token) {
      this.logger.warn("未能获取到弹幕签名所需的全部 cookie。 cna：", this.cna, "token：", this.token);
    }
  }
}

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("youku", async () => {
    const scraper = new YoukuScraper();

    const episodes = await scraper.getEpisodes(scraper.generateIdString({ showId: "eaea48e7a4c746c7b62b" }));
    expect(episodes).toBeDefined();
    expect(episodes.length).toBeGreaterThan(0);
    scraper.logger.info("episodes：", episodes);

    const segments = await scraper.getSegments(episodes[0].episodeId);
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments(episodes[0].episodeId, segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);
  });
}
