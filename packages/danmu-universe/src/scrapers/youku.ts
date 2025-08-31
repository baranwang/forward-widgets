import md5 from "crypto-js/md5";
import { groupBy, uniqBy } from "es-toolkit";
import { qs } from "url-parse";
import { z } from "zod";
import { safeJsonParseWithZod } from "../libs/utils";
import { BaseScraper, CommentMode, type ProviderEpisodeInfo } from "./base";

const youkuEpisodeInfoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
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

const youkuCommentPropertySchema = z.object({
  color: z.number().optional(),
  pos: z.number().optional(),
  size: z.number().optional(),
});

const youkuCommentSchema = z.object({
  id: z.number(),
  content: z.string(),
  playat: z.number(), // milliseconds
  propertis: z
    .string()
    .transform((v) => safeJsonParseWithZod(v, youkuCommentPropertySchema))
    .optional(),
  uid: z.string(),
});

const youkuDanmuResultSchema = z.object({
  data: z.object({
    result: z.array(youkuCommentSchema),
  }),
});

type YoukuEpisodeInfo = z.infer<typeof youkuEpisodeInfoSchema>;

export class YoukuScraper extends BaseScraper {
  providerName = "youku";

  private readonly EPISODE_BLACKLIST_KEYWORDS = ["彩蛋", "加更", "走心", "解忧", "纯享"];

  private get token() {
    const tokenValue = this.fetch.getCookie("_m_h5_tk")?.split("_")[0] ?? "";
    // C# 版本只使用前32个字符用于签名计算
    return tokenValue.substring(0, 32);
  }
  private get cna() {
    return this.fetch.getCookie("cna") ?? "";
  }

  async getEpisodes(mediaId: string, episodeNumber?: number) {
    const allEpisodes: YoukuEpisodeInfo[] = [];
    let page = 1;
    const pageSize = 20;
    let totalEpisodes = 0;

    while (true) {
      try {
        const pageResult = await this.getEpisodesPage(mediaId, page, pageSize);

        if (!pageResult || !pageResult.videos || pageResult.videos.length === 0) {
          break;
        }

        // 第一页时获取总数
        if (page === 1 && pageResult.total) {
          totalEpisodes = pageResult.total;
        }

        // 过滤黑名单关键词
        const filteredVideos = pageResult.videos.filter(
          (video) => !this.EPISODE_BLACKLIST_KEYWORDS.some((keyword) => video.title.includes(keyword)),
        );

        allEpisodes.push(...filteredVideos);

        // 检查是否已获取所有分集或当前页数据不足
        if (allEpisodes.length >= totalEpisodes || pageResult.videos.length < pageSize) {
          break;
        }

        // 如果指定了目标分集且已找到足够数量，停止分页
        if (episodeNumber && allEpisodes.length >= episodeNumber) {
          break;
        }

        page++;
        await this.sleep(300); // 300ms延时
      } catch (error) {
        console.error(`Youku: Failed to get episodes page ${page} for media_id ${mediaId}:`, error);
        break;
      }
    }

    // 转换为ProviderEpisodeInfo格式
    const providerEpisodes = allEpisodes.map<ProviderEpisodeInfo>((ep, i) => ({
      provider: this.providerName,
      episodeId: ep.id,
      episodeTitle: ep.title,
      episodeNumber: i + 1,
      url: ep.link,
    }));

    // 如果指定了目标分集，只返回该分集
    if (episodeNumber !== undefined) {
      const targetEpisode = providerEpisodes.find((ep) => ep.episodeNumber === episodeNumber);
      return targetEpisode ? [targetEpisode] : [];
    }

    return providerEpisodes;
  }

  async getSegments(episodeId: string) {
    const vid = episodeId.replace(/_/g, "=");

    try {
      // 确保token和cookie已设置
      await this.ensureTokenCookie();
      // 获取视频基本信息
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
      const episodeInfo = response.data;
      if (!episodeInfo) {
        console.warn(`Youku: Failed to get episode info for vid ${vid}`);
        return [];
      }

      const totalMat = episodeInfo.totalMat;

      if (totalMat === 0) {
        console.warn(`Youku: Video ${vid} has duration 0, no danmaku to fetch.`);
        return [];
      }

      return Array.from({ length: totalMat }, (_, i) => ({
        provider: this.providerName,
        startTime: i * 60 * 1000,
        segmentId: i.toString(),
      }));
    } catch (error) {
      console.error(`Youku: Failed to get segments for vid ${vid}:`, error);
      return [];
    }
  }

  async getComments(episodeId: string, segmentId: string): Promise<CommentItem[]> {
    // 处理episodeId格式（将下划线替换为等号）
    const vid = episodeId.replace(/_/g, "=");

    try {
      // 确保token和cookie已设置
      await this.ensureTokenCookie();

      const rawComments = await this.getDanmuContentByMat(vid, parseInt(segmentId, 10));
      return this.formatComments(rawComments);
    } catch (error) {
      console.error(`Youku: Failed to get danmaku for vid ${vid}:`, error);
      return [];
    }
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
    if (!this.token || !this.cna) {
      console.error("Youku: Cannot get danmaku, _m_h5_tk is missing.");
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
    const msgEnc = Buffer.from(msgOrderedStr, "utf-8").toString("base64");

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
            t: t,
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
      console.error("Youku: response", response);
      const result = response.data?.data.result?.data.result ?? [];
      console.log(`Youku: 获取到分段 ${mat} 的弹幕 ${result.length} 条`);
      return result;
    } catch (error) {
      console.error(`Youku: 解析弹幕响应失败 (vid=${vid}, mat=${mat}):`, error);
      return [];
    }
  }

  private generateMsgSign(msgEnc: string) {
    return md5(`${msgEnc}MkmC9SoIw6xCkSKHhJ7b5D2r51kBiREr`).toString().toLowerCase();
  }

  private generateTokenSign(t: string, appKey: string, dataPayload: string) {
    return md5([this.token, t, appKey, dataPayload].join("&")).toString().toLowerCase();
  }

  private formatComments(comments: z.infer<typeof youkuCommentSchema>[]): CommentItem[] {
    if (!comments || comments.length === 0) {
      return [];
    }

    // 按弹幕ID去重
    const uniqueComments = uniqBy(comments, (c) => c.id);

    // 按内容对弹幕进行分组
    const groupedByContent = groupBy(uniqueComments, (c) => c.content);

    // 处理重复项
    const processedComments: typeof uniqueComments = [];
    for (const group of Object.values(groupedByContent)) {
      if (group.length === 1) {
        processedComments.push(group[0]);
      } else {
        const firstComment = group.reduce((earliest, current) =>
          current.playat < earliest.playat ? current : earliest,
        );
        processedComments.push({
          ...firstComment,
          content: `${firstComment.content} × ${group.length}`,
        });
      }
    }

    return processedComments.map((comment) => {
      let mode = CommentMode.SCROLL;
      let color = 16777215;

      try {
        const props = comment.propertis;

        if (props) {
          if (props.color) color = props.color;
          if (props.pos === 1) mode = CommentMode.TOP;
          else if (props.pos === 2) mode = CommentMode.BOTTOM;
        }
      } catch {
        // 使用默认值
      }

      const timestamp = comment.playat / 1000.0;

      return this.formatComment({
        id: comment.id.toString(),
        timestamp: timestamp,
        mode: mode,
        color: color,
        content: comment.content,
      });
    });
  }

  /**
   * 确保获取弹幕签名所需的 cna 和 _m_h5_tk cookie。
   * 此逻辑严格参考了 Python 代码，并针对网络环境进行了优化。
   */
  private async ensureTokenCookie() {
    // 步骤 1: 获取 'cna' cookie。它通常由优酷主站或其统计服务设置。
    // 我们优先访问主站，因为它更不容易出网络问题。
    if (!this.cna) {
      try {
        console.debug("Youku: 'cna' cookie 未找到, 正在访问 youku.com 以获取...");
        await this.fetch.get("https://log.mmstat.com/eg.js");
      } catch (error) {
        console.warn(`Youku: 无法连接到 youku.com 获取 'cna' cookie。错误: ${error}`);
      }
    }

    // 步骤 2: 获取 '_m_h5_tk' 令牌, 此请求可能依赖于 'cna' cookie 的存在。
    if (!this.token) {
      try {
        console.debug("Youku: '_m_h5_tk' cookie 未找到, 正在从 acs.youku.com 请求...");
        await this.fetch.get(
          "https://acs.youku.com/h5/mtop.com.youku.aplatform.weakget/1.0/?jsv=2.5.1&appKey=24679788",
        );
      } catch (error) {
        console.error(`Youku: 无法连接到 acs.youku.com 获取令牌 cookie。弹幕获取很可能会失败。错误: ${error}`);
      }
    }

    if (!this.cna || !this.token) {
      console.warn(`Youku: 未能获取到弹幕签名所需的全部 cookie。 cna: '${this.cna}', token: '${this.token}'`);
    }
  }
}

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("youku", async () => {
    const scraper = new YoukuScraper();
    const episodes = await scraper.getEpisodes("cdee9099d49b4137918b");
    expect(episodes).toBeDefined();
    expect(episodes.length).toBeGreaterThan(0);

    const segments = await scraper.getSegments(episodes[0].episodeId);
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments(episodes[0].episodeId, segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);
  });
}
