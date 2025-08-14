import pLimit from "p-limit";
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

export abstract class BaseScraper {
  abstract providerName: string;

  abstract getEpisodes(mediaId: string, episodeIndex?: number): Promise<ProviderEpisodeInfo[]>;

  abstract getComments(episodeId: string): Promise<CommentItem[]>;

  protected fetch: Fetch;
  protected limit = pLimit(3);

  private _cookie: Record<string, string> = {};
  private _headers: Record<string, string> = {};

  get cookie() {
    return this._cookie;
  }
  set cookie(value: Record<string, string>) {
    this._cookie = value;
    this.fetch.setCookie(value);
  }
  get headers() {
    return this._headers;
  }
  set headers(value: Record<string, string>) {
    this._headers = value;
    this.fetch.setHeaders(value);
  }

  constructor() {
    this.fetch = new Fetch(this._cookie, this._headers);
  }

  protected sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
