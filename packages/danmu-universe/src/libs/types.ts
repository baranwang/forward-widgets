import type { MediaType } from "../constants";

/**
 * 如果是剧集，视频 ID 仅返回第一集的 ID，其他集数需要通过 API 获取
 */
export interface Douban2VideoPlatformResponse {
  mediaType: MediaType;
  qq?: {
    cid: string;
  };
  iqiyi?: {
    aid: string;
    vid: string;
  };
  youku?: {
    showId: string;
  };
}
