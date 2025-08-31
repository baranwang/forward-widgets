import { groupBy, uniqBy } from "es-toolkit";
import { qs } from "url-parse";
import { z } from "zod";
import { TTL_2_HOURS } from "../libs/storage";
import { safeJsonParseWithZod } from "../libs/utils";
import { BaseScraper, CommentMode } from "./base";

const tencentEpisodeSchema = z.object({
  vid: z.string().refine((val) => !!val),
  is_trailer: z.string().refine((val) => val !== "1"),
  title: z.string().refine((val) => {
    const junkKeywords = ["预告", "彩蛋", "直拍", "直播回顾", "加更", "走心", "解忧", "纯享", "节点"];
    for (const keyword of junkKeywords) {
      if (val.includes(keyword)) {
        return false;
      }
    }
    return true;
  }),
  union_title: z.optional(z.string()).refine((val) => {
    if (val?.includes("预告")) {
      return false;
    }
    return true;
  }),
});

const tencentEpisodeResultSchema = z.object({
  data: z.object({
    module_list_datas: z.array(
      z.object({
        module_datas: z.array(
          z.object({
            item_data_lists: z.object({
              item_datas: z.array(
                z.object({
                  item_params: z.unknown(),
                }),
              ),
            }),
          }),
        ),
      }),
    ),
  }),
});

const tencentSegmentIndexSchema = z.object({
  segment_index: z.record(
    z.string(),
    z.object({
      segment_name: z.string(),
    }),
  ),
});

const tencentContentStyleSchema = z.object({
  color: z.string().optional(),
  position: z.number().optional(),
});

const tencentCommentItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  time_offset: z.string(),
  content_style: z
    .string()
    .optional()
    .transform((v) => safeJsonParseWithZod(v ?? "", tencentContentStyleSchema)),
});

const tencentSegmentSchema = z.object({
  barrage_list: z
    .array(
      z.unknown().transform((v) => {
        const { success, data } = tencentCommentItemSchema.safeParse(v);
        if (success) {
          return data;
        }
        return null;
      }),
    )
    .transform((v) => v.filter((v) => v !== null)),
});

type TencentSegmentIndex = z.infer<typeof tencentSegmentIndexSchema>;
type TencentCommentItem = z.infer<typeof tencentCommentItemSchema>;

const pageSize = 100;

export class TencentScraper extends BaseScraper {
  providerName = "tencent";

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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
  }

  async getEpisodes(mediaId: string, episodeNumber?: number) {
    // 获取指定cid的所有分集列表
    // mediaId 对于腾讯来说就是 cid
    const tencentEpisodes = await this.internalGetEpisodes(mediaId);
    const allProviderEpisodes = tencentEpisodes.map((ep, i) => {
      let episodeIndex = this.getEpisodeIndexFromTitle(ep.title);
      if (!episodeIndex) {
        episodeIndex = i + 1;
      }
      return {
        provider: this.providerName,
        episodeId: ep.vid || "",
        episodeTitle: ep.union_title && ep.union_title !== ep.title ? ep.union_title : ep.title,
        episodeNumber: episodeIndex,
        url: `https://v.qq.com/x/cover/${mediaId}/${ep.vid}.html`,
      };
    });

    // 如果指定了目标，则只返回目标分集
    if (episodeNumber !== undefined) {
      const targetEpisode = allProviderEpisodes.find((ep) => ep.episodeNumber === episodeNumber);
      return targetEpisode ? [targetEpisode] : [];
    }

    return allProviderEpisodes;
  }

  async getSegments(vid: string) {
    let segmentIndex: TencentSegmentIndex["segment_index"] = {};
    try {
      const response = await this.fetch.get(`https://dm.video.qq.com/barrage/base/${vid}`, {
        schema: tencentSegmentIndexSchema,
        cache: {
          cacheKey: `tencent:segment:${vid}`,
          ttl: TTL_2_HOURS,
        },
      });

      if (!response.data) {
        return [];
      }

      if (!response.data?.segment_index) {
        console.info(`vid='${vid}' 没有找到弹幕分段索引。`);
        return [];
      }
      segmentIndex = response.data.segment_index;
    } catch (e: any) {
      console.error(`获取弹幕索引失败 (vid=${vid})`, e);
      return [];
    }

    const sortedKeys = Object.keys(segmentIndex).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    console.debug(`为 vid='${vid}' 找到 ${sortedKeys.length} 个弹幕分段`);

    return sortedKeys.map((key) => {
      return {
        provider: this.providerName,
        startTime: parseInt(key, 10),
        segmentId: segmentIndex[key]?.segment_name,
      };
    });
  }

  async getComments(episodeId: string, segmentId: string) {
    const rawComments = await this.internalGetComments(episodeId, segmentId);

    if (!rawComments || rawComments.length === 0) {
      return [];
    }

    // 按弹幕ID去重
    const uniqueComments = uniqBy(rawComments, (c) => c.id);

    // 1. 按内容对弹幕进行分组
    const groupedByContent = groupBy(uniqueComments, (c) => c.content);

    // 2. 处理重复项
    const processedComments: typeof uniqueComments = [];
    for (const group of Object.values(groupedByContent)) {
      if (group.length === 1) {
        processedComments.push(group[0]);
      } else {
        const firstComment = group.reduce((earliest, current) => {
          return parseInt(current.time_offset, 10) < parseInt(earliest.time_offset, 10) ? current : earliest;
        });
        firstComment.content = `${firstComment.content} × ${group.length}`;
        processedComments.push(firstComment);
      }
    }

    // 3. 格式化处理后的弹幕列表
    return processedComments.map<CommentItem>((c) => {
      let mode = CommentMode.SCROLL; // 滚动
      let color = 16777215; // 白色

      if (c.content_style) {
        if (c.content_style.position === 2) {
          mode = CommentMode.TOP; // 顶部
        } else if (c.content_style.position === 3) {
          mode = CommentMode.BOTTOM; // 底部
        }

        if (c.content_style.color) {
          try {
            color = parseInt(c.content_style.color, 10);
          } catch (e) {
            // 转换失败则使用默认白色
          }
        }
      }
      return this.formatComment({
        id: c.id,
        timestamp: parseInt(c.time_offset, 10) / 1000.0,
        mode,
        color,
        content: c.content,
      });
    });
  }

  /**
   * 从分集标题（如 "01", "第01集"）中解析出集数
   */
  private getEpisodeIndexFromTitle(title: string): number | null {
    if (!title) {
      return null;
    }
    // 用于从标题中提取集数的正则表达式
    const episodeIndexPattern = /^(?:第)?(\d+)(?:集|话)?$/;
    const match = episodeIndexPattern.exec(title.trim());
    if (match) {
      try {
        return parseInt(match[1], 10);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * 获取指定cid的所有分集列表。
   * 处理了腾讯视频复杂的分页逻辑。
   */
  private async internalGetEpisodes(cid: string) {
    const results = [];
    let page = 0;
    let pageContext = "";

    this.fetch.setHeaders({
      Referer: `https://v.qq.com/x/cover/${cid}.html`,
    });

    while (true) {
      const response = await this.fetch.post(
        "https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2",
        {
          page_params: {
            cid,
            page_type: "detail_operation",
            page_id: "vsite_episode_list",
            id_type: "1",
            page_size: pageSize.toString(),
            lid: "0",
            req_from: "web_mobile",
            page_context: pageContext,
          },
          has_cache: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          schema: tencentEpisodeResultSchema,
          cache: {
            cacheKey: `tencent:episodes:${cid}:${page}`,
          },
        },
      );
      const itemDatas =
        response.data?.data?.module_list_datas?.[0]?.module_datas?.[0]?.item_data_lists?.item_datas ?? [];
      if (itemDatas.length >= pageSize) {
        page += 1;
        pageContext = qs.stringify({
          episode_begin: page * pageSize,
          episode_end: (page + 1) * pageSize,
          episode_step: pageSize,
        });
      } else {
        pageContext = "";
      }
      for (const item of itemDatas) {
        const { success, data } = tencentEpisodeSchema.safeParse(item.item_params);
        if (success) {
          results.push(data);
        }
      }
      if (!pageContext) {
        break;
      }
    }
    return results;
  }

  private async internalGetComments(vid: string, segmentId: string): Promise<TencentCommentItem[]> {
    try {
      const response = await this.fetch.get(`https://dm.video.qq.com/barrage/segment/${vid}/${segmentId}`, {
        schema: tencentSegmentSchema,
        cache: {
          cacheKey: `tencent:comments:${vid}:${segmentId}`,
        },
      });
      return response.data?.barrage_list ?? [];
    } catch (e: any) {
      console.error(`获取分段 ${segmentId} 失败 (vid=${vid}): ${e.message}`, e);
      return [];
    }
  }
}

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("tencent", async () => {
    const scraper = new TencentScraper();
    const episodes = await scraper.getEpisodes("mzc00200tjkzeps");
    expect(episodes).toBeDefined();
    expect(episodes.length).toBe(1);
    expect(episodes[0].episodeId).toBe("y4101qnn3jo");

    const segments = await scraper.getSegments("y4101qnn3jo");
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments("y4101qnn3jo", segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);
  });
}
