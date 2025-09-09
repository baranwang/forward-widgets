import { isEqual, keyBy, sortBy, uniqWith } from "es-toolkit";
import { MediaType } from "../libs/constants";
import { QihooMatcher } from "../matchers/360kan";
import type {
  BaseScraper,
  ProviderCommentItem,
  ProviderDramaInfo,
  ProviderEpisodeInfo,
  ProviderSegmentInfo,
} from "./base";
import { BilibiliScraper } from "./bilibili";
import { IqiyiScraper } from "./iqiyi";
import { MgTVScraper } from "./mgtv";
import { providerConfigSchema } from "./provider-config";
import { RenRenScraper } from "./renren";
import { TencentScraper } from "./tencent";
import { YoukuScraper } from "./youku";

const scrapers = [TencentScraper, YoukuScraper, IqiyiScraper, BilibiliScraper, RenRenScraper, MgTVScraper];

export type GetEpisodeParam = {
  provider: string;
  idString: string;
  episodeNumber?: number;
};

export class Scraper {
  private scrapers: BaseScraper[] = [];

  constructor() {
    scrapers.forEach((Scraper) => {
      this.scrapers.push(new Scraper());
    });
  }

  /**
   * 获取 provider 名称到 scraper 实例的映射
   * 使用懒加载和缓存提升性能
   */
  private _scraperMap?: Record<string, BaseScraper>;

  get scraperMap(): Record<string, BaseScraper> & {
    tencent: TencentScraper;
    youku: YoukuScraper;
    iqiyi: IqiyiScraper;
    bilibili: BilibiliScraper;
    renren: RenRenScraper;
    mgtv: MgTVScraper;
  } {
    if (!this._scraperMap) {
      this._scraperMap = keyBy(this.scrapers, (scraper) => scraper.providerName);
    }
    return this._scraperMap as any;
  }

  private async getSegmentsByProvider(provider: string, idString: string): Promise<ProviderSegmentInfo[]> {
    const scraper = this.scraperMap[provider];
    if (!scraper) return [];
    let segments = await scraper.getSegments(idString);
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

  private async getSegmentWithTime(
    segmentTime = 0,
    ...args: { provider: string; idString: string }[]
  ): Promise<CommentItem[]> {
    const tasks: Promise<{ comments: Array<ProviderCommentItem | null>; provider: string } | null>[] = [];

    for (const { provider, idString } of args) {
      tasks.push(
        (async () => {
          const segments = await this.getSegmentsByProvider(provider, idString);
          if (!segments.length) return null;
          const hit = this.findSegmentAtTime(segments, segmentTime);
          if (!hit) return null;
          const scraper = this.scraperMap[provider];
          if (!scraper) return null;
          const comments = await scraper.getComments(idString, hit.segmentId);
          if (!comments) return null;
          return { comments, provider };
        })(),
      );
    }

    const results = await Promise.all(tasks);
    const contentMap = new Map<string, { item: ProviderCommentItem; count: number; provider: string }>();
    for (const result of results) {
      if (!result?.comments?.length) continue;

      for (const comment of result.comments) {
        if (!comment) continue;

        const key = [comment.mode, comment.color, comment.content].join("___");
        const existing = contentMap.get(key);
        if (!existing) {
          contentMap.set(key, { item: comment, count: 1, provider: result.provider });
        } else {
          if (comment.timestamp < existing.item.timestamp) {
            existing.item = comment;
          }
          existing.count += 1;
        }
      }
    }
    const comments: CommentItem[] = [];
    contentMap.forEach(({ item, count, provider }) => {
      const content = count > 1 ? `${item.content} × ${count}` : item.content;
      comments.push({
        cid: item.id,
        p: `${item.timestamp.toFixed(2)},${item.mode},${item.color},[${provider}]` as CommentItem["p"],
        m: content,
      });
    });

    return comments;
  }

  getDanmuWithSegmentTimeByVideoId(id: string, segmentTime: number) {
    const items = id.split(",").map((item) => {
      const [provider, idString] = item.split(":");
      return {
        provider,
        idString,
      };
    });
    return this.getSegmentWithTime(segmentTime, ...items);
  }

  async getEpisodes(...args: GetEpisodeParam[]) {
    const tasks: Promise<ProviderEpisodeInfo[]>[] = [];
    for (const { provider, idString, episodeNumber } of uniqWith(args, isEqual)) {
      const scraper = this.scraperMap[provider];
      if (!scraper) continue;
      tasks.push(
        scraper.getEpisodes(idString, episodeNumber).catch((error) => {
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

  private getEpisodeNumber(mediaType: MediaType, episode?: string) {
    if (mediaType === MediaType.TV && episode) {
      return parseInt(episode);
    }
    return undefined;
  }

  async getDetailWithAnimeId(animeId: string, mediaType: MediaType, episode?: string) {
    const [provider, idString] = animeId.split(":");
    return await this.getEpisodes({ provider, idString, episodeNumber: this.getEpisodeNumber(mediaType, episode) });
  }

  async getEpisodeParams(searchParams: SearchDanmuParams) {
    const dramaTasks: Promise<ProviderDramaInfo[]>[] = [];
    for (const scraper of this.scrapers) {
      if (scraper.search) {
        dramaTasks.push(
          scraper.search(searchParams).catch((error) => {
            console.error(error);
            return [];
          }),
        );
      }
    }
    const results = await Promise.all(dramaTasks);
    const dramas = results.flat();
    if (!dramas.length) return [];

    const episodeNumber = this.getEpisodeNumber(searchParams.type as MediaType, searchParams.episode);
    const options: GetEpisodeParam[] = [];
    for (const drama of dramas) {
      try {
        const scraper = this.scraperMap[drama.provider];
        if (!scraper) continue;
        const idString = scraper.generateIdString({ dramaId: drama.dramaId });
        options.push({ provider: drama.provider, idString, episodeNumber });
      } catch (error) {}
    }

    try {
      if (searchParams.qihooSearch === "true") {
        const qihooMatcher = new QihooMatcher();
        const searchOptions = await qihooMatcher.getEpisodeParams(searchParams);
        options.push(...searchOptions);
      }
    } catch (error) {}

    return options;
  }

  setProviderConfig(params: BaranwangDanmuUniverse.GlobalParams) {
    const { success, data } = providerConfigSchema.safeParse(params);
    if (success) {
      this.scrapers.forEach((scraper) => {
        scraper.providerConfig = data;
      });
    }
  }
}

export const scraper = new Scraper();
