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

interface ProviderCommentItem {
  id: string | number;
  /** 弹幕时间戳(秒) */
  timestamp: number;
  /** 弹幕模式 */
  mode: CommentMode;
  /** 弹幕颜色 */
  color: number;
  /** 弹幕内容 */
  content: string;
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

  protected formatComments<T>(
    rawComments: T[],
    transformer: (item: T, index: number, array: T[]) => ProviderCommentItem,
  ): CommentItem[] {
    const seenIds = new Set<string | number>();
    const contentMap = new Map<string, { item: ProviderCommentItem; count: number }>();

    let index = 0;
    for (const raw of rawComments) {
      const item = transformer(raw, index, rawComments);
      index += 1;

      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      const key = item.content;
      const existing = contentMap.get(key);
      if (!existing) {
        contentMap.set(key, { item, count: 1 });
      } else {
        if (item.timestamp < existing.item.timestamp) {
          existing.item = item;
        }
        existing.count += 1;
      }
    }

    const result: CommentItem[] = [];
    contentMap.forEach(({ item, count }) => {
      const content = count > 1 ? `${item.content} × ${count}` : item.content;
      result.push({
        cid: item.id,
        p: `${item.timestamp.toFixed(2)},${item.mode},${item.color},[${this.providerName}]` as CommentItem["p"],
        m: content,
      });
    });

    return result;
  }

  private readonly GLOBAL_EPISODE_BLACKLIST_DEFAULT =
    "^(.*?)((.+?版)|(特(别|典))|((导|演)员|嘉宾|角色)访谈|福利|彩蛋|花絮|预告|特辑|专访|访谈|幕后|周边|资讯|看点|速看|回顾|盘点|合集|PV|MV|CM|OST|ED|OP|BD|特典|SP|NCOP|NCED|MENU|Web-DL|rip|x264|x265|aac|flac)(.*?)$";
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
