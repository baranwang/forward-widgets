import { get } from "es-toolkit/compat";
import { qs } from "url-parse";
import { DEFAULT_COLOR_INT } from "../libs/constants";
import { Fetch } from "../libs/fetch";
import { Logger } from "../libs/logger";
import { z } from "../libs/zod";
import { getEpisodeBlacklistPattern } from "./blacklist";
import type { GlobalParamsConfig } from "./config";
import { parseEpNumber } from "./parse-ep-number";

export interface ProviderDramaInfo {
  /** 数据源提供方 */
  provider: string;
  /** 剧集ID */
  dramaId: string;
  /** 剧集标题 */
  dramaTitle: string;
  /** 季序号 */
  season: number;
}

export interface ProviderEpisodeInfo {
  /** 数据源提供方 */
  provider: string;
  /** 该数据源中的分集ID (e.g., tencent的vid) */
  episodeId: string;
  /** 分集标题 */
  episodeTitle: string;
  /** 分集序号 */
  episodeNumber: number;
}

export interface ProviderSegmentInfo {
  provider: string;
  /** 分段ID */
  segmentId: string;
  /** 分段开始时间(秒) */
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

export const providerCommentItemSchema = z.object({
  /** 弹幕ID */
  id: z.coerce.string().optional(),
  /** 弹幕时间戳(秒) */
  timestamp: z.coerce.number(),
  /** 弹幕模式 */
  mode: z.enum(CommentMode).catch(CommentMode.SCROLL).optional().default(CommentMode.SCROLL),
  /** 弹幕颜色 */
  color: z.number().catch(DEFAULT_COLOR_INT).optional().default(DEFAULT_COLOR_INT),
  /** 弹幕内容 */
  content: z.string(),
});

export type ProviderCommentItem = z.infer<typeof providerCommentItemSchema>;

export abstract class BaseScraper<IDType extends z.ZodType = any> {
  public providerName = "base";

  public logger: Logger;

  protected fetch = new Fetch();

  constructor() {
    this.logger = new Logger(this.providerName);
  }

  private _providerConfig = {} as GlobalParamsConfig["provider"];

  public get providerConfig() {
    return this._providerConfig;
  }
  public set providerConfig(config: GlobalParamsConfig["provider"]) {
    const currentConfig = get(config, this.providerName);
    if (currentConfig) {
      this.logger.debug("设置 Provider 配置", currentConfig);
      this._providerConfig = config;
    }
  }

  abstract idSchema: IDType;

  protected parseIdString(idString: string): z.infer<IDType> | null {
    const decodedIdString = qs.parse(idString);
    const result = this.idSchema?.safeParse(decodedIdString);
    if (!result) {
      this.logger.error("parseIdString", idString, "idSchema is not defined");
      return null;
    }
    if (!result.success) {
      this.logger.error("parseIdString", idString, z.prettifyError(result.error));
      return null;
    }
    return result.data ?? null;
  }
  generateIdString(id: z.infer<IDType>) {
    return qs.stringify(this.idSchema.parse(id) as object);
  }

  search?(params: SearchDanmuParams): Promise<ProviderDramaInfo[]>;

  abstract getEpisodes(idString: string, episodeIndex?: number): Promise<ProviderEpisodeInfo[]>;

  abstract getSegments(idString: string): Promise<ProviderSegmentInfo[]>;

  abstract getComments(idString: string, segmentId: string): Promise<Array<ProviderCommentItem | null> | null>;

  protected getEpisodeIndexFromTitle(title: string): number | null {
    return parseEpNumber(title);
  }

  protected PROVIDER_SPECIFIC_BLACKLIST = "";

  get episodeBlacklistPattern() {
    return getEpisodeBlacklistPattern(this.PROVIDER_SPECIFIC_BLACKLIST);
  }
}
