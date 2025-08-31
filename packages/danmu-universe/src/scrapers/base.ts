import { Fetch } from "../libs/fetch";

export interface ProviderEpisodeInfo {
  /** 数据源提供方 */
  provider: string;
  /** 该数据源中的分集ID (e.g., tencent的vid) */
  episodeId: string;
  /** 分集标题 */
  episodeTitle: string;
  /** 分集序号 */
  episodeNumber: number;
  /** 分集原始URL */
  url?: string;
}

export interface ProviderSegmentInfo {
  provider: string;
  segmentId: string;
  startTime: number;
}

export enum CommentMode {
  /** 滚动 */
  SCROLL = 1,
  /** 底部 */
  BOTTOM = 4,
  /** 顶部 */
  TOP = 5,
}

export abstract class BaseScraper {
  abstract providerName: string;

  abstract getEpisodes(mediaId: string, episodeIndex?: number): Promise<ProviderEpisodeInfo[]>;

  abstract getSegments(episodeId: string): Promise<ProviderSegmentInfo[]>;

  abstract getComments(episodeId: string, segmentId: string): Promise<CommentItem[]>;

  protected fetch = new Fetch();

  protected sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected formatComment({
    id,
    timestamp,
    mode,
    color,
    content,
  }: {
    id: string | number;
    timestamp: number;
    mode: CommentMode;
    color: number;
    content: string;
  }): CommentItem {
    return {
      cid: id,
      p: `${timestamp.toFixed(2)},${mode},${color},[${this.providerName}]`,
      m: content,
    } as CommentItem;
  }
}
