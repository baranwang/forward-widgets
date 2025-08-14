import { groupBy } from "es-toolkit";
import { qs } from "url-parse";
import * as z from "zod/mini";
import { safeJsonParseWithZod } from "../libs/utils";
import { BaseScraper } from "./base";

const tencentEpisodeSchema = z.object({
  vid: z.string().check(z.refine((val) => !!val)),
  is_trailer: z.string().check(z.refine((val) => val !== "1")),
  title: z.string().check(
    z.refine((val) => {
      const junkKeywords = ["预告", "彩蛋", "直拍", "直播回顾", "加更", "走心", "解忧", "纯享", "节点"];
      for (const keyword of junkKeywords) {
        if (val.includes(keyword)) {
          return false;
        }
      }
      return true;
    }),
  ),
  union_title: z.optional(z.string()).check(
    z.refine((val) => {
      if (val?.includes("预告")) {
        return false;
      }
      return true;
    }),
  ),
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
  color: z.optional(z.string()),
  position: z.optional(z.number()),
});

const tencentCommentItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  time_offset: z.string(),
  content_style: z.pipe(
    z.optional(z.string()),
    z.transform((v) => safeJsonParseWithZod(v ?? "", tencentContentStyleSchema)),
  ),
});

const tencentSegmentSchema = z.object({
  barrage_list: z.array(tencentCommentItemSchema),
});

type TencentSegmentIndex = z.infer<typeof tencentSegmentIndexSchema>;
type TencentCommentItem = z.infer<typeof tencentCommentItemSchema>;

const pageSize = 100;

export class TencentScraper extends BaseScraper {
  providerName = "tencent";

  constructor() {
    super();
    this.cookie = {
      pgv_pvid: "40b67e3b06027f3d",
      video_platform: "2",
      vversion_name: "8.2.95",
      video_bucketid: "4",
      video_omgid: "0a1ff6bc9407c0b1cff86ee5d359614d",
    };
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
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

  async getComments(episodeId: string) {
    const rawComments = await this.internalGetComments(episodeId);

    if (!rawComments || rawComments.length === 0) {
      return [];
    }

    // 按弹幕ID去重
    const uniqueComments = Array.from(new Map(rawComments.map((c) => [c.id, c])).values());

    // 1. 按内容对弹幕进行分组
    const groupedByContent = groupBy(uniqueComments, (c) => c.content);

    // 2. 处理重复项
    const processedComments: TencentCommentItem[] = [];
    for (const group of Object.values(groupedByContent)) {
      if (group.length === 1) {
        processedComments.push(group[0]);
      } else {
        const firstComment = group.reduce((earliest, current) => {
          return parseInt(current.time_offset, 10) < parseInt(earliest.time_offset, 10) ? current : earliest;
        });
        firstComment.content = `${firstComment.content} ×${group.length}`;
        processedComments.push(firstComment);
      }
    }

    // 3. 格式化处理后的弹幕列表
    const formattedComments = processedComments.map<CommentItem>((c) => {
      let mode = 1; // 滚动
      let color = 16777215; // 白色

      if (c.content_style) {
        if (c.content_style.position === 2) {
          mode = 5; // 顶部
        } else if (c.content_style.position === 3) {
          mode = 4; // 底部
        }

        if (c.content_style.color) {
          try {
            color = parseInt(c.content_style.color, 10);
          } catch (e) {
            // 转换失败则使用默认白色
          }
        }
      }

      const timestamp = parseInt(c.time_offset, 10) / 1000.0;
      const p_string = `${timestamp.toFixed(2)},${mode},${color},[${this.providerName}]`;

      return {
        cid: c.id,
        p: p_string,
        m: c.content,
      };
    });

    return formattedComments;
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
        },
      );

      if (response.statusCode !== 200) {
        throw new Error(`Failed to get Tencent video vid: ${response.statusCode}, ${JSON.stringify(response.data)}`);
      }
      const result = tencentEpisodeResultSchema.safeParse(response.data);
      if (!result.success) {
        throw new Error(`Failed to parse Tencent video vid: ${result.error}`);
      }

      const itemDatas = result.data.data?.module_list_datas?.[0]?.module_datas?.[0]?.item_data_lists?.item_datas ?? [];
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

  private async internalGetComments(vid: string): Promise<TencentCommentItem[]> {
    const allComments: TencentCommentItem[] = [];

    // 1. 获取弹幕分段索引
    let segmentIndex: TencentSegmentIndex["segment_index"] = {};

    try {
      const response = await this.fetch.get(`https://dm.video.qq.com/barrage/base/${vid}`);
      if (response.statusCode !== 200) {
        console.error(`获取腾讯弹幕索引失败 (vid=${vid}): ${response.statusCode}`);
        return [];
      }

      const result = tencentSegmentIndexSchema.safeParse(response.data);
      if (!result.success) {
        console.error(`获取腾讯弹幕索引失败 (vid=${vid}): ${result.error}`);
        return [];
      }

      if (!result.data?.segment_index) {
        console.info(`vid='${vid}' 没有找到弹幕分段索引。`);
        return [];
      }
      segmentIndex = result.data.segment_index;
    } catch (e: any) {
      console.error(`获取弹幕索引失败 (vid=${vid})`, e);
      return [];
    }

    // 2. 遍历分段，获取弹幕内容
    const sortedKeys = Object.keys(segmentIndex).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    console.debug(`为 vid='${vid}' 找到 ${sortedKeys.length} 个弹幕分段，开始获取...`);

    const segmentTasks = sortedKeys.map((key) =>
      this.limit(async () => {
        const segment = segmentIndex[key];
        const segmentName = segment.segment_name;
        if (!segmentName) {
          return [];
        }

        try {
          const response = await this.fetch.get(`https://dm.video.qq.com/barrage/segment/${vid}/${segmentName}`);
          if (response.statusCode !== 200) {
            console.error(`获取分段 ${segmentName} 失败 (vid=${vid}): ${response.statusCode}`);
            return [];
          }
          const result = tencentSegmentSchema.safeParse(response.data);
          if (!result.success) {
            console.error(`获取分段 ${segmentName} 失败 (vid=${vid}): ${result.error}`);
            return [];
          }

          const validComments: TencentCommentItem[] = [];
          for (const commentItem of result.data?.barrage_list ?? []) {
            if (commentItem.id && typeof commentItem.content === "string") {
              validComments.push(commentItem);
            } else {
              console.warn(`跳过一个无效的弹幕项目: ${JSON.stringify(commentItem)}`);
            }
          }
          return validComments;
        } catch (e: any) {
          console.error(`获取分段 ${segmentName} 失败 (vid=${vid}): ${e.message}`, e);
          return [];
        }
      }),
    );

    const segmentResults = await Promise.all(segmentTasks);
    for (const comments of segmentResults) {
      allComments.push(...comments);
    }

    console.info(`vid='${vid}' 弹幕获取完成，共 ${allComments.length} 条。`);

    return allComments;
  }
}

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("getEpisodes", async () => {
    const scraper = new TencentScraper();
    const episodes = await scraper.getEpisodes("mzc00200tjkzeps");
    expect(episodes).toBeDefined();
    expect(episodes.length).toBe(1);
    expect(episodes[0].episodeId).toBe("y4101qnn3jo");
  });

  test("getComments", async () => {
    const scraper = new TencentScraper();
    const comments = await scraper.getComments("y4101qnn3jo");
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);
  });
}
