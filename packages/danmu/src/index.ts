import parseUrl from 'url-parse';
import { DOUBAN_API_KEY } from './constants';
import type { Douban2VideoPlatformResponse } from './types';

export class IDBridge {
  /**
   * IMDB ID 转 豆瓣 ID
   */
  async imdb2douban(imdbId: string) {
    const response = await Widget.http.post<{
      id: string;
      rating: {
        min: number;
        max: number;
        average: `${number}`;
        numRaters: number;
      };
      title: string;
      alt_title: string;
      image: string;
      summary: string;
      attrs: Record<string, string[]>;
      mobile_link: string;
      tags: {
        count: number;
        name: string;
      }[];
    }>(`https://api.douban.com/v2/movie/imdb/${imdbId}`, {
      body: JSON.stringify({
        apikey: DOUBAN_API_KEY,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to convert IMDB ID to Douban ID: ${response.statusCode}, ${JSON.stringify(response.data)}`,
      );
    }
    const doubanId = response.data?.id?.split('/')?.pop();
    if (!doubanId) {
      throw new Error(`Failed to convert IMDB ID to Douban ID: ${response.data.id}`);
    }
    if (/\d+/.test(doubanId)) {
      return {
        doubanId,
        originResponse: response.data,
      };
    }
    return null;
  }

  /**
   * 豆瓣 ID 转 各视频平台 ID
   */
  async douban2videoPlatform(doubanId: string) {
    const response = await Widget.http.get<{
      is_tv: boolean;
      vendors: {
        id: string;
        is_ad: boolean;
        uri: string;
      }[];
    }>(`https://m.douban.com/rexxar/api/v2/movie/${doubanId}?for_mobile=1`, {
      headers: {
        Referer: `https://m.douban.com/movie/subject/${doubanId}/?dt_dapp=1`,
        'Content-Type': 'application/json',
      },
    });
    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to convert Douban ID to Video Platform ID: ${response.statusCode}, ${JSON.stringify(response.data)}`,
      );
    }
    const result: Douban2VideoPlatformResponse = {
      mediaType: response.data.is_tv ? 'tv' : 'movie',
    };
    for (const vendor of response.data.vendors) {
      if (vendor.is_ad) {
        continue;
      }
      const uriObj = parseUrl(vendor.uri, true);

      switch (vendor.id) {
        case 'qq': {
          const { cid, vid } = uriObj.query;
          if (cid && vid) {
            result.qq = { cid, vid };
          }
          break;
        }
        case 'iqiyi': {
          const { aid, vid } = uriObj.query;
          if (aid && vid) {
            result.iqiyi = { aid, vid };
          }
          break;
        }

        case 'youku': {
          const { showid: showId } = uriObj.query;
          if (showId) {
            result.youku = { showId };
          }
          break;
        }

        default:
          break;
      }
    }
    return result;
  }
}
