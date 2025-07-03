import { qs } from 'url-parse';

interface TencentVideoItem {
  item_params: {
    vid: string;
    is_trailer: '0' | '1';
    title: string;
    union_title: string;
  };
}

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

const pageSize = 100;

/**
 * 获取腾讯视频信息
 * @param cid 视频合集 ID
 * @returns 视频信息列表
 */
export const getTencentVideoInfoByCid = async (cid: string) => {
  const iterator = {
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
          throw new Error(`Failed to get Tencent video vid: ${response.statusCode}, ${JSON.stringify(response.data)}`);
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
  const results = [];
  for await (const item of iterator) {
    results.push(item);
  }
  return results;
};

/**
 * 获取腾讯视频弹幕列表
 * @param vid 视频 ID
 * @returns 弹幕列表
 */
export const getTencentDanmuListByVid = async (vid: string) => {
  const response = await Widget.http.get<{
    segment_index: Record<
      string,
      {
        segment_start: `${number}`;
        segment_name: string;
      }
    >;
  }>(`https://dm.video.qq.com/barrage/base/${vid}`);

  return response.data.segment_index;
};

/**
 * 获取腾讯视频弹幕详情
 * @param vid 视频 ID
 * @param segment_name 弹幕片段名称，从 getTencentDanmuListByVid 获取
 */
export const getTencentDanmuDetailByVid = async (vid: string, segment_name: string) => {
  const response = await Widget.http.get<{
    barrage_list: {
      content: string;
    }[];
  }>(`https://dm.video.qq.com/barrage/segment/${vid}/${segment_name}`);
  return response.data.barrage_list;
};

//#region unit tests

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import('@forward-widget/shared/widget-adaptor');
    rstest.stubGlobal('Widget', WidgetAdaptor);
  });

  test('getTencentVideoInfoByCid', async () => {
    const results = await getTencentVideoInfoByCid('mzc00200iyue5he');
    expect(results.length).toBe(35);
    expect(results[0]).toHaveProperty('vid', 'k410187y6uq');
  });

  test('getTencentDanmu', async () => {
    const result = await getTencentDanmuListByVid('k410187y6uq');
    expect(result).instanceOf(Object);
  });

  test('getTencentDanmuDetailByVid', async () => {
    const result = await getTencentDanmuDetailByVid('k410187y6uq', 't/v1/0/30000');
    expect(result).instanceOf(Array);
  });
}

//#endregion
