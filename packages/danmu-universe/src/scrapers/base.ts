import { z } from "zod";
import { Fetch } from "../libs/fetch";
import { safeJsonParse } from "../libs/utils";

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

export interface ProviderCommentItem {
  /** 弹幕ID */
  id: string;
  /** 弹幕时间戳(秒) */
  timestamp: number;
  /** 弹幕模式 */
  mode: CommentMode;
  /** 弹幕颜色 */
  color: number;
  /** 弹幕内容 */
  content: string;
}

export abstract class BaseScraper<IDType extends z.ZodType = any> {
  abstract providerName: string;

  protected idSchema?: IDType;

  protected parseIdString(idString: string): z.infer<IDType> | null {
    const decodedIdString = safeJsonParse(decodeURIComponent(idString));
    const result = this.idSchema?.safeParse(decodedIdString);
    if (!result) {
      console.log(this.providerName, "parseIdString", idString, "idSchema is not defined");
      return null;
    }
    if (!result.success) {
      console.log(this.providerName, "parseIdString", idString, z.prettifyError(result.error));
      return null;
    }
    return result.data ?? null;
  }
  generateIdString(id: z.infer<IDType>) {
    return encodeURIComponent(JSON.stringify(id));
  }

  protected search?(params: SearchDanmuParams): Promise<ProviderEpisodeInfo[]>;

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
      console.error(`编译分集黑名单正则表达式失败: '${finalRegexStr}'. 错误: ${e}`);
    }
    return null;
  }
}
