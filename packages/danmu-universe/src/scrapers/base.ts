interface ProviderEpisodeInfo {
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

  async getComments(episodeId: string) {
    throw new Error("Not implemented");
  }
}
