export interface HttpResponse<T> {
  data: T;
  headers: Record<string, string>;
  statusCode: number;
}

export interface FetchAdapter {
  get: <T>(url: string, options?: RequestInit) => Promise<HttpResponse<T>>;
  post: <T>(url: string, options?: RequestInit) => Promise<HttpResponse<T>>;
}

export interface IDBridgeOptions {
  fetch: FetchAdapter;
}

/**
 * 如果是剧集，视频 ID 仅返回第一集的 ID，其他集数需要通过 API 获取
 */
export interface Douban2VideoPlatformResponse {
  mediaType: 'movie' | 'tv';
  qq?: {
    cid: string;
    vid: string;
  };
  iqiyi?: {
    aid: string;
    vid: string;
  };
}
