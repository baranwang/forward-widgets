import { keyBy, sortBy } from "es-toolkit";
import { MediaType } from "../constants";
import { getDoubanInfoByTmdbId, getVideoPlatformInfoByDoubanId } from "../libs/douban";
import type { BaseScraper, ProviderEpisodeInfo, ProviderSegmentInfo } from "./base";
import { IqiyiScraper } from "./iqiyi";
import { TencentScraper } from "./tencent";
import { YoukuScraper } from "./youku";

export class Scraper {
  private scrapers: BaseScraper[] = [];

  constructor() {
    this.scrapers.push(new TencentScraper(), new YoukuScraper(), new IqiyiScraper());
  }

  get scraperMap() {
    return keyBy(this.scrapers, (scraper) => scraper.providerName);
  }

  private async getSegmentsByProvider(provider: string, videoId: string): Promise<ProviderSegmentInfo[]> {
    const scraper = this.scraperMap[provider];
    if (!scraper) return [];
    let segments = await scraper.getSegments(videoId);
    segments = sortBy(segments, ["startTime"]);
    return segments;
  }

  private findSegmentAtTime(segments: ProviderSegmentInfo[], time: number): ProviderSegmentInfo | null {
    if (!segments.length) return null;
    let low = 0;
    let high = segments.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const midStart = segments[mid].startTime;
      if (midStart <= time) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx = high;
    if (idx < 0) return null;
    return segments[idx] ?? null;
  }

  async getSegmentWithTime(segmentTime = 0, ...args: { videoId: string; provider: string }[]) {
    const tasks: Promise<CommentItem[]>[] = [];

    for (const { provider, videoId } of args) {
      tasks.push(
        (async () => {
          const segments = await this.getSegmentsByProvider(provider, videoId);
          if (!segments.length) return [];
          const hit = this.findSegmentAtTime(segments, segmentTime);
          if (!hit) return [];
          return this.scraperMap[provider]?.getComments(videoId, hit.segmentId);
        })(),
      );
    }

    const results = await Promise.all(tasks);
    return results.flat();
  }

  getDanmuWithSegmentTimeByVideoId(id: string, segmentTime: number) {
    const items = id.split(",").map((item) => {
      const [provider, videoId] = item.split(":");
      return {
        provider,
        videoId,
      };
    });
    return this.getSegmentWithTime(segmentTime, ...items);
  }

  getEpisodesFactory(mediaType: MediaType) {
    return async (...args: { provider: string; mediaId: string }[]) => {
      const tasks: Promise<ProviderEpisodeInfo[]>[] = [];
      for (const { provider, mediaId } of args) {
        tasks.push(this.scraperMap[provider]?.getEpisodes(mediaId));
      }
      const rawResults = await Promise.all(tasks).catch((error) => {
        console.error(error);
        return [];
      });
      const results = rawResults.flat();
      if (mediaType === MediaType.Movie) {
        // 把所有的 Provider ID 合并成一个
        const episodeId = results.map((item) => `${item.provider}:${item.episodeId}`).join(",");
        return [
          {
            ...results[0],
            provider: "",
            episodeId,
          },
        ];
      }
      return results.map((item) => {
        return {
          ...item,
          episodeId: `${item.provider}:${item.episodeId}`,
          episodeTitle: `${item.provider}:${item.episodeTitle}`,
        };
      });
    };
  }

  async getDoubanId(params: GetDetailParams) {
    const { animeId, tmdbId, type: mediaType } = params;
    if (animeId) {
      return animeId;
    }
    if (tmdbId) {
      const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId);
      return doubanInfo?.doubanId ?? "";
    }
    return "";
  }

  async getDetailWithDoubanId(params: GetDetailParams) {
    const doubanId = await this.getDoubanId(params);
    if (!doubanId) {
      return [];
    }
    const response = await getVideoPlatformInfoByDoubanId(doubanId.toString());
    const getEpisodes = this.getEpisodesFactory(params.type as MediaType);
    const options: Parameters<typeof getEpisodes> = [];
    Object.entries(response.providers).forEach(([provider, { id }]) => {
      options.push({ provider, mediaId: id });
    });
    const results = await getEpisodes(...options);
    const episodeNumber = params.episode ? parseInt(params.episode ?? "") : undefined;
    if (params.type === MediaType.TV && episodeNumber) {
      return results.filter((item) => {
        return item.episodeNumber === episodeNumber;
      });
    }
    return results;
  }
}
