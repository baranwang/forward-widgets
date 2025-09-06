import { get } from "es-toolkit/compat";
import { z } from "zod";
import { DEFAULT_COLOR_INT } from "../libs/constants";
import { Fetch } from "../libs/fetch";
import { safeJsonParse } from "../libs/utils";
import type { ProviderConfig } from "./provider-config";

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
  abstract providerName: string;

  private _providerConfig = {} as ProviderConfig;

  protected get providerConfig() {
    return this._providerConfig;
  }
  protected set providerConfig(config: ProviderConfig) {
    const currentConfig = get(config, this.providerName);
    if (currentConfig) {
      this.logger.debug("设置 Provider 配置", currentConfig);
      this._providerConfig = config;
    }
  }

  protected idSchema?: IDType;

  protected parseIdString(idString: string): z.infer<IDType> | null {
    const decodedIdString = safeJsonParse(decodeURIComponent(idString));
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
    return encodeURIComponent(JSON.stringify(id));
  }

  search?(params: SearchDanmuParams): Promise<ProviderDramaInfo[]>;

  abstract getEpisodes(idString: string, episodeIndex?: number): Promise<ProviderEpisodeInfo[]>;

  abstract getSegments(idString: string): Promise<ProviderSegmentInfo[]>;

  abstract getComments(idString: string, segmentId: string): Promise<Array<ProviderCommentItem | null> | null>;

  protected fetch = new Fetch();

  protected sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getEpisodeIndexFromTitle(title: string): number | null {
    if (!title) {
      return null;
    }
    // 用于从标题中提取集数的正则表达式
    const episodeIndexPattern = /(?:第)?(\d+)(?:集|话)?$/;
    const match = episodeIndexPattern.exec(title.trim());
    if (match) {
      try {
        return parseInt(match[1], 10);
      } catch (error) {
        this.logger.error("从标题中提取集数失败：", title, "错误：", error);
        return null;
      }
    }
    return null;
  }

  private readonly GLOBAL_EPISODE_BLACKLIST_DEFAULT =
    "^(.*?)((.+?版)|(特(别|典))|((导|演)员|嘉宾|角色)访谈|福利|先导|彩蛋|花絮|预告|特辑|专访|访谈|幕后|周边|资讯|看点|速看|回顾|盘点|合集|PV|MV|CM|OST|ED|OP|BD|特典|SP|NCOP|NCED|MENU|Web-DL|rip|x264|x265|aac|flac)(.*?)$";
  protected PROVIDER_SPECIFIC_BLACKLIST_DEFAULT = "";

  getEpisodeBlacklistPattern(): RegExp | null {
    /**
     * 获取最终用于过滤分集标题的正则表达式对象。
     * 它会合并全局黑名单和特定于提供商的黑名单。
     */
    // 1. 获取全局黑名单
    const globalPatternStr = this.GLOBAL_EPISODE_BLACKLIST_DEFAULT;

    // 2. 获取特定于提供商的黑名单
    const providerPatternStr = this.PROVIDER_SPECIFIC_BLACKLIST_DEFAULT;

    // 3. 合并两个正则表达式
    const finalPatterns: string[] = [];
    if (globalPatternStr?.trim()) {
      finalPatterns.push(`(${globalPatternStr})`);
    }

    if (providerPatternStr?.trim()) {
      finalPatterns.push(`(${providerPatternStr})`);
    }

    if (finalPatterns.length === 0) {
      return null;
    }

    const finalRegexStr = finalPatterns.join("|");
    try {
      return new RegExp(finalRegexStr, "i");
    } catch (e) {
      this.logger.error("编译分集黑名单正则表达式失败：", finalRegexStr, "错误：", e);
    }
    return null;
  }

  logger = {
    log: (level: "debug" | "info" | "warn" | "error", ...args: any[]) => {
      console[level](`[${this.providerName}]`, ...args);
    },
    debug: (...args: any[]) => {
      this.logger.log("debug", ...args);
    },
    info: (...args: any[]) => {
      this.logger.log("info", ...args);
    },
    warn: (...args: any[]) => {
      this.logger.log("warn", ...args);
    },
    error: (...args: any[]) => {
      this.logger.log("error", ...args);
    },
  };
}
