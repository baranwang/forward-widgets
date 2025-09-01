import { compact } from "es-toolkit";
import { z } from "zod";
import { base64ToUint8Array } from "../../libs/utils";
import { BaseScraper, CommentMode, type ProviderEpisodeInfo } from "../base";
import { biliproto } from "./dm.proto.js";

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

export class BilibiliScraper extends BaseScraper {
  providerName = "bilibili";

  private readonly DmSegMobileReply = biliproto.community.service.dm.v1.DmSegMobileReply;

  constructor() {
    super();
    this.fetch.setHeaders({
      Referer: "https://www.bilibili.com/",
    });
  }

  async getEpisodes(seasonId: string, episodeNumber?: number) {
    const results: ProviderEpisodeInfo[] = [];
    const episodes = await this.getPgcEpisodes(seasonId);
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
        episodeId: [seasonId, item.aid, item.cid].join(","),
        episodeTitle: item.title,
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
    const [seasonId, aid, cid] = episodeId.split(",");
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
    const [seasonId, aid, cid] = episodeId.split(",");
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
      const sanitizedContent = comment.content?.replace(/\0/g, "") || "";
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
    const response = await this.fetch.get("https://api.bilibili.com/x/v3/pgc/season/episode", {
      params: {
        season_id: seasonId,
      },
      schema: pgcEpisodeResultSchema,
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
