import { compact } from "es-toolkit";
import { z } from "zod";
import { base64ToUint8Array } from "../../libs/utils";
import { BaseScraper, type ProviderEpisodeInfo, providerCommentItemSchema } from "../base";
import { biliproto } from "./dm.proto";

const bilibiliIdSchema = z.object({
  seasonId: z.string(),
  aid: z.string().optional(),
  cid: z.string().optional(),
});

export type BilibiliId = z.infer<typeof bilibiliIdSchema>;

const pgcEpisodeSchema = z.object({
  aid: z.int(),
  cid: z.int(),
  badge: z.string(),
  duration: z.number(),
  title: z.string(),
  show_title: z.string(),
  long_title: z.string(),
});

const pgcEpisodeResultSchema = z.object({
  code: z.literal(0),
  result: z.object({
    episodes: z.array(z.unknown().transform((v) => pgcEpisodeSchema.safeParse(v).data)).transform((v) => compact(v)),
  }),
});

export class BilibiliScraper extends BaseScraper<typeof bilibiliIdSchema> {
  providerName = "bilibili";

  protected idSchema = bilibiliIdSchema;

  private readonly DmSegMobileReply = biliproto.community.service.dm.v1.DmSegMobileReply;

  constructor() {
    super();
    this.fetch.setHeaders({
      Referer: "https://www.bilibili.com/",
    });
  }

  async getEpisodes(idString: string, episodeNumber?: number) {
    const bilibiliId = this.parseIdString(idString);
    if (!bilibiliId) {
      return [];
    }
    const results: ProviderEpisodeInfo[] = [];
    const episodes = await this.getPgcEpisodes(bilibiliId.seasonId);
    const blacklistPattern = this.getEpisodeBlacklistPattern();

    let episodeIndex = 1;
    for (const item of episodes ?? []) {
      if (item.badge === "预告") {
        this.logger.warn("预告，跳过，title：", item.title);
        continue;
      }
      if (blacklistPattern?.test(item.title)) {
        this.logger.warn("黑名单，跳过，title：", item.title);
        continue;
      }
      results.push({
        provider: this.providerName,
        episodeId: this.generateIdString({
          seasonId: bilibiliId.seasonId,
          aid: item.aid.toString(),
          cid: item.cid.toString(),
        }),
        episodeTitle: item.show_title || item.title,
        episodeNumber: episodeIndex,
      });
      episodeIndex += 1;
    }
    if (episodeNumber) {
      return results.filter((ep) => ep.episodeNumber === episodeNumber);
    }
    return results;
  }

  async getSegments(episodeId: string) {
    const { aid, cid, seasonId } = this.parseIdString(episodeId) ?? {};
    if (!aid || !cid || !seasonId) {
      return [];
    }
    const episodes = await this.getPgcEpisodes(seasonId);
    const episode = episodes?.find((ep) => ep.aid === parseInt(aid) && ep.cid === parseInt(cid));
    if (!episode) {
      return [];
    }

    return Array.from({ length: Math.floor(episode.duration / 1000 / 360) + 1 }, (_, i) => ({
      provider: this.providerName,
      startTime: i * 360,
      segmentId: (i + 1).toString(),
    }));
  }

  async getComments(idString: string, segmentId: string) {
    const { aid, cid, seasonId } = this.parseIdString(idString) ?? {};
    if (!aid || !cid || !seasonId) {
      this.logger.warn("aid：", aid, "cid：", cid, "seasonId：", seasonId, "不存在");
      return null;
    }
    const episodes = await this.getPgcEpisodes(seasonId);
    const episode = episodes?.find((ep) => ep.aid === parseInt(aid) && ep.cid === parseInt(cid));
    if (!episode) {
      this.logger.warn("未找到分集，aid：", aid, "cid：", cid, "seasonId：", seasonId);
      return null;
    }
    const comments = await this.fetchCommentsForCid(aid, cid, segmentId);
    if (!comments) {
      this.logger.warn("未找到弹幕，aid：", aid, "cid：", cid, "segmentId：", segmentId);
      return null;
    }
    return comments.map((comment) => {
      if (!comment.progress) {
        return null;
      }
      const sanitizedContent = comment.content?.toString().replace(/\0/g, "") || "";
      if (!sanitizedContent) {
        return null;
      }
      return (
        providerCommentItemSchema.safeParse({
          id: comment.id.toString(),
          timestamp: comment.progress / 1000,
          mode: comment.mode,
          color: comment.color,
          content: sanitizedContent,
        }).data ?? null
      );
    });
  }

  private async getPgcEpisodes(seasonId: string) {
    const response = await this.fetch.get("https://api.bilibili.com/pgc/view/web/ep/list", {
      params: {
        season_id: seasonId,
      },
      schema: pgcEpisodeResultSchema,
      cache: {
        cacheKey: `bilibili:episodes:${seasonId}`,
      },
    });

    return response.data?.result.episodes;
  }

  private async fetchCommentsForCid(aid: string, cid: string, segmentIndex: string) {
    try {
      const response = await this.fetch.get<string>("https://api.bilibili.com/x/v2/dm/web/seg.so", {
        params: {
          type: "1",
          oid: cid,
          pid: aid,
          segment_index: segmentIndex,
        },
        base64Data: true,
      });
      if (response.statusCode === 404 || response.statusCode === 304) return null;
      const data = this.DmSegMobileReply.decode(base64ToUint8Array(response.data));
      return data.elems;
    } catch (error) {
      this.logger.error("获取分段", segmentIndex, "失败，aid：", aid, "cid：", cid, "错误：", error);
    }

    return null;
  }
}

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("bilibili", async () => {
    const scraper = new BilibiliScraper();
    const episodes = await scraper.getEpisodes(scraper.generateIdString({ seasonId: "45969" }));
    expect(episodes).toBeDefined();
    expect(episodes.length).toBeGreaterThan(0);

    const segments = await scraper.getSegments(episodes[0].episodeId);
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments(episodes[0].episodeId, segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments?.length).toBeGreaterThan(0);
    scraper.logger.info("获取", comments?.length, "条弹幕");
  });
}
