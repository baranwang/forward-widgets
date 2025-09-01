import MD5 from "crypto-js/md5";
import { compact } from "es-toolkit";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { BaseScraper, CommentMode, type ProviderEpisodeInfo } from "./base";

const iqiyiEpisodeTabDataVideoSchema = z
  .object({
    page_url: z.string(),
    short_display_name: z.string(),
    title: z.string(),
    mark_type_show: z.int().optional(),
  })
  .transform((v) => {
    return {
      ...v,
      get videoId() {
        const match = v.page_url.match(/v_(\S+)\.html/);
        return match?.[1] ?? "";
      },
    };
  });

const iqiyiEpisodeTabDataSchema = z.object({
  data: z
    .array(
      z
        .object({
          videos: z
            .object({
              feature_paged: z
                .record(
                  z.string(),
                  z.array(
                    z.unknown().transform((v) => {
                      const result = iqiyiEpisodeTabDataVideoSchema.safeParse(v);
                      if (!result.success) {
                        console.warn(`爱奇艺: 解析分集数据时发生错误:`, z.prettifyError(result.error), v);
                      }
                      return result.data;
                    }),
                  ),
                )
                .optional()
                .transform((v) => compact(Object.values(v ?? {}).flat())),
            })
            .optional(),
        })
        .transform((v) => v.videos?.feature_paged),
    )
    .transform((v) => compact(v.flat())),
});

const iqiyiV3ApiResponseSchema = z.object({
  status_code: z.number(),
  data: z
    .object({
      base_data: z.object({
        video_list: z
          .array(
            z.object({
              tv_id: z.string(),
              name: z.string(),
              order: z.number(),
              play_url: z.string(),
            }),
          )
          .optional(),
      }),
      template: z.object({
        tabs: z.array(
          z.object({
            tab_id: z.string(),
            tab_title: z.string(),
            blocks: z.array(
              z.object({
                bk_id: z.string(),
                bk_type: z.string(),
                data: z.unknown().optional(),
              }),
            ),
          }),
        ),
      }),
    })
    .optional(),
});

const iqiyiVideoBaseInfoResponseSchema = z.object({
  code: z.literal("A00000"),
  data: z.object({
    tvId: z.int(),
    albumId: z.int(),
    durationSec: z.int(),
  }),
});

const iqiyiBulletInfoSchema = z.object({
  contentId: z.string(),
  content: z.string(),
  showTime: z.number(),
  color: z.string().optional().default("FFFFFF"),
});

const iqiyiCommentsEntrySchema = z.object({
  int: z.number(),
  list: z.object({
    bulletInfo: z
      .array(z.unknown().transform((v) => iqiyiBulletInfoSchema.safeParse(v).data))
      .transform((v) => compact(v)),
  }),
});

const iqiyiCommentsResponseSchema = z.object({
  danmu: z.looseObject({
    code: z.literal("A00000"),
    data: z.object({
      entry: z
        .array(z.unknown().transform((v) => iqiyiCommentsEntrySchema.safeParse(v).data?.list.bulletInfo))
        .transform((v) => compact(v.flat())),
    }),
  }),
});

export class IqiyiScraper extends BaseScraper {
  providerName = "iqiyi";

  private readonly xmlParser = new XMLParser();

  protected PROVIDER_SPECIFIC_BLACKLIST_DEFAULT =
    "^(.*?)(抢先(版|篇)?|加更(版|篇)?|花絮|预告|特辑|彩蛋|专访|幕后(故事|花絮)?|直播|纯享|未播|衍生|番外|会员(专属|加长)?|片花|精华|看点|速览|解读|reaction|影评)(.*?)$";

  constructor() {
    super();
    this.fetch.setCookie({
      pgv_pvid: "40b67e3b06027f3d",
      video_platform: "2",
      vversion_name: "8.2.95",
      video_bucketid: "4",
      video_omgid: "0a1ff6bc9407c0b1cff86ee5d359614d",
    });
    this.fetch.setHeaders({
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36 Edg/136.0.0.0",
    });
  }

  async getEpisodes(mediaId: string, episodeNumber?: number) {
    let providerEpisodes: ProviderEpisodeInfo[] = [];
    try {
      providerEpisodes = await this.getEpisodesV3(mediaId);
    } catch (error) {
      console.warn(`爱奇艺: 新版API (v3) 获取分集时发生错误: ${error}`, error);
      providerEpisodes = [];
    }
    if (!providerEpisodes.length) {
      // TODO: 回退到旧版API
      // console.warn("爱奇艺: 新版API (v3) 未返回分集或失败，正在回退到旧版API...");
    }
    return this.filterAndFinalizeEpisodes(providerEpisodes, episodeNumber);
  }

  async getSegments(episodeId: string) {
    const baseInfo = await this.getVideoBaseInfo(episodeId);
    const duration = baseInfo?.durationSec;
    if (!duration) {
      return [];
    }

    return Array.from({ length: Math.floor(duration / 300) + 1 }, (_, i) => ({
      provider: this.providerName,
      startTime: i * 300,
      segmentId: (i + 1).toString(),
    }));
  }

  async getComments(episodeId: string, segmentId: string) {
    const baseInfo = await this.getVideoBaseInfo(episodeId);
    if (!baseInfo) {
      console.warn(`爱奇艺: 无法将 video_id '${episodeId}' 转换为 entity_id。`);
      return [];
    }
    const tvId = baseInfo?.tvId.toString();

    if (!tvId || tvId.length < 4) {
      return [];
    }
    const s1 = tvId.slice(-4, -2);
    const s2 = tvId.slice(-2);

    const url = `http://cmts.iqiyi.com/bullet/${s1}/${s2}/${tvId}_300_${segmentId}.z`;
    console.debug(`URL构建: s1=${s1}, s2=${s2}, 完整URL=${url}`);

    const response = await this.fetch.get<string>(url, { zlibMode: true });

    const xmlData = this.xmlParser.parse(response.data);
    const { success, data, error } = iqiyiCommentsResponseSchema.safeParse(xmlData);
    if (!success) {
      console.warn(`爱奇艺: 解析弹幕数据时发生错误:`, z.prettifyError(error));
      return [];
    }

    return this.formatComments(data.danmu.data.entry, (comment) => {
      let color = 16777215;
      try {
        color = parseInt(comment.color, 16);
      } catch (error) {}
      return {
        id: comment.contentId,
        timestamp: comment.showTime,
        mode: CommentMode.SCROLL,
        color,
        content: comment.content,
      };
    });
  }

  private async getEpisodesV3(entityId: string) {
    const timestamp = Date.now().toString();
    const params: Record<string, any> = {
      entity_id: entityId,
      device_id: "qd5fwuaj4hunxxdgzwkcqmefeb3ww5hx",
      auth_cookie: "",
      user_id: "0",
      vip_type: "-1",
      vip_status: "0",
      conduit_id: "",
      pcv: "13.082.22866",
      app_version: "13.082.22866",
      ext: "",
      app_mode: "standard",
      scale: "100",
      timestamp: timestamp,
      src: "pca_tvg",
      os: "",
      ad_ext: '{"r":"2.2.0-ares6-pure"}',
    };

    params.sign = this.createSign(params);

    try {
      const response = await this.fetch.get("https://www.iqiyi.com/prelw/tvg/v2/lw/base_info", {
        params,
        schema: iqiyiV3ApiResponseSchema,
      });

      const result = response.data;

      const episodes: ProviderEpisodeInfo[] =
        result?.data?.base_data?.video_list?.map((ep) => ({
          provider: this.providerName,
          episodeId: ep.tv_id.toString(),
          episodeTitle: ep.name,
          episodeNumber: ep.order,
          url: ep.play_url,
        })) ?? [];

      if (!episodes.length) {
        const tabData = result?.data?.template?.tabs
          ?.find((tab) =>
            tab.blocks.some((block) => block.bk_id === "selector_bk" && block.bk_type === "album_episodes"),
          )
          ?.blocks?.find((block) => block.bk_id === "selector_bk" && block.bk_type === "album_episodes")?.data;
        const { success, data, error } = iqiyiEpisodeTabDataSchema.safeParse(tabData);
        if (!success) {
          console.warn(`爱奇艺: 解析分集数据时发生错误:`, z.prettifyError(error), tabData);
          return [];
        }
        const blacklistPattern = this.getEpisodeBlacklistPattern();
        let episodeIndex = 1;
        for (const ep of data.data) {
          /**
           * 17: 预告
           */
          if (ep.mark_type_show === 17) {
            continue;
          }
          const tvId = this.videoIdToEntityId(ep.videoId);
          if (!tvId) {
            continue;
          }
          if (blacklistPattern?.test(ep.title)) {
            continue;
          }
          episodes.push({
            provider: this.providerName,
            episodeId: tvId,
            episodeTitle: ep.title,
            episodeNumber: this.getEpisodeIndexFromTitle(ep.short_display_name) ?? episodeIndex,
            url: ep.page_url,
          });
          episodeIndex += 1;
        }
      }
      console.log(episodes);

      return episodes;
    } catch (error) {
      console.error(`爱奇艺 (v3): 获取分集时发生错误: ${error}`);
      return [];
    }
  }

  /**将视频ID (v_...中的部分) 转换为entity_id */
  private videoIdToEntityId(videoId: string): string | null {
    try {
      const base36Decoded = parseInt(videoId, 36);
      const xorResult = BigInt(base36Decoded) ^ BigInt(0x75706971676c);
      let finalResult: bigint;
      if (xorResult < BigInt(9e5)) {
        finalResult = BigInt(100) * (xorResult + BigInt(9e5));
      } else {
        finalResult = xorResult;
      }
      return finalResult.toString();
    } catch (error) {
      console.error(`将 video_id '${videoId}' 转换为 entity_id 时出错: ${error}`);
      return null;
    }
  }

  private createSign(params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .filter((key) => key !== "sign")
      .sort()
      .map((key) => `${key}=${params[key] ?? ""}`)
      .join("&");
    return MD5(`${paramString}&secret_key=howcuteitis`).toString().toUpperCase();
  }

  /**对分集列表应用黑名单过滤并返回最终结果 */
  private filterAndFinalizeEpisodes(episodes: ProviderEpisodeInfo[], targetEpisodeIndex?: number) {
    // 统一过滤逻辑
    const blacklistPattern = this.getEpisodeBlacklistPattern();
    if (blacklistPattern) {
      const originalCount = episodes.length;
      episodes = episodes.filter((ep) => !blacklistPattern.test(ep.episodeTitle));
      if (originalCount > episodes.length) {
        console.info(`爱奇艺: 根据黑名单规则过滤掉了 ${originalCount - episodes.length} 个分集。`);
      }
    }

    if (targetEpisodeIndex) {
      return episodes.filter((ep) => ep.episodeNumber === targetEpisodeIndex);
    }
    return episodes;
  }

  private async getVideoBaseInfo(entityId: string) {
    const response = await this.fetch.get(`https://pcw-api.iqiyi.com/video/video/baseinfo/${entityId}`, {
      schema: iqiyiVideoBaseInfoResponseSchema,
      cache: {
        cacheKey: `iqiyi:video:baseinfo:${entityId}`,
      },
    });

    return response.data?.data;
  }
}

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("iqiyi", async () => {
    const scraper = new IqiyiScraper();

    const episodes = await scraper.getEpisodes("5298806780347900");
    expect(episodes).toBeDefined();
    expect(episodes.length).toBeGreaterThan(0);

    const segments = await scraper.getSegments("5298806780347900");
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments("5298806780347900", segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);

    // const episodes = await scraper.getEpisodes("1for8p7vk40");
    // console.log(episodes);
    // expect(episodes).toBeDefined();
    // expect(episodes.length).toBe(1);
  });
}
