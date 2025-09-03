import { compact } from "es-toolkit";
import { z } from "zod";
import { base64ToUint8Array } from "../../libs/utils";
import { BaseScraper, CommentMode, type ProviderEpisodeInfo } from "../base";
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
        continue;
      }
      if (blacklistPattern?.test(item.title)) {
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

  async getComments(episodeId: string, segmentId: string) {
    const { aid, cid, seasonId } = this.parseIdString(episodeId) ?? {};
    if (!aid || !cid || !seasonId) {
      return [];
    }
    const episodes = await this.getPgcEpisodes(seasonId);
    const episode = episodes?.find((ep) => ep.aid === parseInt(aid) && ep.cid === parseInt(cid));
    if (!episode) {
      return [];
    }
    const comments = await this.fetchCommentsForCid(aid, cid, segmentId);
    return this.formatComments(comments, (comment) => {
      if (!comment.progress) {
        return null;
      }
      const sanitizedContent = comment.content?.toString().replace(/\0/g, "") || "";
      if (!sanitizedContent) {
        return null;
      }
      return {
        id: comment.id,
        timestamp: comment.progress / 1000.0,
        mode: comment.mode ?? CommentMode.SCROLL,
        color: comment.color ?? 16777215,
        content: sanitizedContent,
      };
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
    const results: biliproto.community.service.dm.v1.IDanmakuElem[] = [];
    try {
      const response = await this.fetch.get<string>(
        `https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=${cid}&pid=${aid}&segment_index=${segmentIndex}`,
        {
          base64Data: true,
        },
      );
      if (response.statusCode === 404 || response.statusCode === 304) return results;
      const data = this.DmSegMobileReply.decode(base64ToUint8Array(response.data));
      results.push(...data.elems);
    } catch (error) {
      console.error(`获取分段 ${segmentIndex} 失败 (aid=${aid}, cid=${cid}): ${error}`);
    }

    return results;
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
    expect(comments.length).toBeGreaterThan(0);
    import("node:fs").then((fs) => {
      fs.writeFileSync("bilibili.json", JSON.stringify(comments, null, 2));
    });
    console.log("获取", comments.length, "条弹幕");
  });
}
