import { DOUBAN_API_KEY, MediaType, VideoPlatform } from '@forward-widget/shared';
import parseUrl, { qs } from 'url-parse';
import type { Douban2VideoPlatformResponse } from './types';

class IDBridge {
  /**
   * 获取 TMDB 外部 ID 信息
   */
  async getExternalIdsByTmdbId(type: MediaType, tmdbId: string) {
    const response = await Widget.tmdb.get<{
      imdb_id: string;
      wikidata_id: string;
      facebook_id: string;
      instagram_id: string;
      twitter_id: string;
    }>(`/3/${type}/${tmdbId}/external_ids`);
    if (response.statusCode !== 200) {
      throw new Error(`Failed to get external IDs: ${response.statusCode}, ${JSON.stringify(response.data)}`);
    }
    return response.data;
  }

  /**
   * 获取豆瓣信息（通过 IMDB ID）
   */
  async getDoubanInfoByImdbId(imdbId: string) {
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
      throw new Error(`Failed to get Douban info: ${response.statusCode}, ${JSON.stringify(response.data)}`);
    }
    const doubanId = response.data?.id?.split('/')?.pop();
    if (!doubanId) {
      throw new Error(`Failed to extract Douban ID from response: ${response.data.id}`);
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
   * 获取豆瓣信息（通过 TMDB ID）
   */
  async getDoubanInfoByTmdbId(type: MediaType, tmdbId: string) {
    const externalIds = await this.getExternalIdsByTmdbId(type, tmdbId);
    if (!externalIds.imdb_id) {
      return null;
    }
    return this.getDoubanInfoByImdbId(externalIds.imdb_id);
  }

  /**
   * 获取视频平台信息（通过豆瓣 ID）
   */
  async getVideoPlatformInfoByDoubanId(doubanId: string) {
    const response = await Widget.http.get<{
      is_tv: boolean;
      vendors: {
        id: VideoPlatform;
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
      throw new Error(`Failed to get video platform info: ${response.statusCode}, ${JSON.stringify(response.data)}`);
    }
    const result: Douban2VideoPlatformResponse = {
      mediaType: response.data.is_tv ? MediaType.TV : MediaType.Movie,
    };
    for (const vendor of response.data.vendors) {
      if (vendor.is_ad) {
        continue;
      }
      const uriObj = parseUrl(vendor.uri, true);

      switch (vendor.id) {
        case VideoPlatform.腾讯视频: {
          const { cid } = uriObj.query;
          if (cid) {
            result.qq = { cid };
          }
          break;
        }
        case VideoPlatform.爱奇艺: {
          const { aid, vid } = uriObj.query;
          if (aid && vid) {
            result.iqiyi = { aid, vid };
          }
          break;
        }

        case VideoPlatform.优酷: {
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

  private async getTencentVideoInfoByCidWithIterator(cid: string) {
    interface TencentVideoItem {
      item_params: {
        vid: string;
        is_trailer: '0' | '1';
        title: string;
        union_title: string;
      };
    }

    const pageSize = 100;

    const filterItemData = (item: TencentVideoItem) => {
      if (item.item_params.is_trailer === '1') {
        return false;
      }
      for (const title of ['直拍', '彩蛋', '采访', '直播回顾']) {
        if (item.item_params.title.includes(title)) {
          return false;
        }
      }
      return true;
    };

    return {
      async *[Symbol.asyncIterator]() {
        let hasMore = true;
        let page = 0;

        while (hasMore) {
          const response = await Widget.http.post<{
            data: {
              module_list_datas: [
                {
                  module_datas: [
                    {
                      item_data_lists: {
                        item_datas: TencentVideoItem[];
                      };
                    },
                  ];
                },
              ];
            };
          }>(
            'https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2',
            {
              headers: {
                Referer: `https://v.qq.com/x/cover/${cid}.html`,
                Cookie: 'video_platform=2; vversion_name=8.2.95',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                page_params: {
                  req_from: 'web_vsite',
                  page_id: 'vsite_episode_list',
                  page_type: 'detail_operation',
                  id_type: '1',
                  detail_page_type: '1',
                  cid,
                  page_context: qs.stringify({
                    episode_begin: page * pageSize,
                    episode_end: (page + 1) * pageSize,
                    episode_step: pageSize,
                    page_num: page,
                    page_size: pageSize,
                  }),
                },
                has_cache: 1,
              }),
            },
          );

          if (response.statusCode !== 200) {
            throw new Error(
              `Failed to get Tencent video vid: ${response.statusCode}, ${JSON.stringify(response.data)}`,
            );
          }

          const itemDatas =
            response.data.data?.module_list_datas?.[0]?.module_datas?.[0]?.item_data_lists?.item_datas?.filter(
              filterItemData,
            );
          if (!itemDatas?.length) {
            hasMore = false;
            break;
          }
          page += 1;
          for (const item of itemDatas) {
            yield item.item_params;
          }
        }
      },
    };
  }

  async getTencentVideoInfoByCid(cid: string) {
    const iterator = await this.getTencentVideoInfoByCidWithIterator(cid);
    const results = [];
    for await (const item of iterator) {
      results.push(item);
    }
    return results;
  }
}

export const idBridge = new IDBridge();
