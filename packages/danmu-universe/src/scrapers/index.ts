import { keyBy, sortBy } from "es-toolkit";
import { MediaType } from "../constants";
import { getVideoPlatformInfoByDoubanId } from "../libs/douban";
import type { BaseScraper, ProviderEpisodeInfo, ProviderSegmentInfo } from "./base";
import { BilibiliScraper } from "./bilibili";
import { IqiyiScraper } from "./iqiyi";
import { TencentScraper } from "./tencent";
import { YoukuScraper } from "./youku";

const scrapers = [TencentScraper, YoukuScraper, IqiyiScraper, BilibiliScraper];

export class Scraper {
  private scrapers: BaseScraper[] = [];

  constructor() {
    scrapers.forEach((Scraper) => {
      this.scrapers.push(new Scraper());
    });
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

  private async getEpisodes(...args: { provider: string; mediaId: string }[]) {
    const tasks: Promise<ProviderEpisodeInfo[]>[] = [];
    for (const { provider, mediaId } of args) {
      const scraper = this.scraperMap[provider];
      if (!scraper) continue;
      tasks.push(
        scraper.getEpisodes(mediaId).catch((error) => {
          console.error(error);
          return [];
        }),
      );
    }
    const rawResults = await Promise.all(tasks).catch((error) => {
      console.error(error);
      return [];
    });
    const results = rawResults.flat();
    return results.map((item) => {
      return {
        ...item,
        episodeId: `${item.provider}:${item.episodeId}`,
      };
    });
  }

  private formatEpisodeResult(results: ProviderEpisodeInfo[], mediaType: MediaType, episode?: string) {
    const episodeNumber = episode ? parseInt(episode ?? "") : undefined;
    if (mediaType === MediaType.TV && episodeNumber) {
      return results.filter((item) => {
        return item.episodeNumber === episodeNumber;
      });
    }
    return results;
  }

  async getDetailWithAnimeId(animeId: string, mediaType: MediaType, episode?: string) {
    const [provider, episodeId] = animeId.split(":");
    const results = await this.getEpisodes({ provider, mediaId: episodeId });
    return this.formatEpisodeResult(results, mediaType, episode);
  }

  async getDetailWithDoubanId(doubanId: string, mediaType: MediaType, episode?: string) {
    const response = await getVideoPlatformInfoByDoubanId(doubanId.toString());
    const options: Parameters<typeof this.getEpisodes> = [];
    Object.entries(response.providers).forEach(([provider, { id }]) => {
      options.push({ provider, mediaId: id });
    });
    const results = await this.getEpisodes(...options);
    return this.formatEpisodeResult(results, mediaType, episode);
  }
}
