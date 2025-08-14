import { qs } from "url-parse";
import { BaseScraper } from "./base";

interface TencentVideoItem {
  item_params: {
    vid?: string;
    is_trailer: "0" | "1";
    title: string;
    union_title?: string;
  };
}

const pageSize = 100;

export class TencentScraper extends BaseScraper {
  providerName = "tencent";

  async getEpisodes(mediaId: string, episodeNumber?: number) {
    // 获取指定cid的所有分集列表
    // mediaId 对于腾讯来说就是 cid
    const tencentEpisodes = await this.getTencentVideoInfoByCid(mediaId);

    const allProviderEpisodes = tencentEpisodes.map((ep, i) => ({
      provider: this.providerName,
      episodeId: ep.vid || "",
      episodeTitle: ep.title,
      episodeNumber: i + 1,
      url: `https://v.qq.com/x/cover/${mediaId}/${ep.vid}.html`,
    }));

    // 如果指定了目标，则只返回目标分集
    if (episodeNumber !== undefined) {
      const targetEpisode = allProviderEpisodes.find((ep) => ep.episodeNumber === episodeNumber);
      return targetEpisode ? [targetEpisode] : [];
    }

    return allProviderEpisodes;
  }

  private async getTencentVideoInfoByCid(cid: string) {
    const results = [];
    let page = 0;
    let pageContext = "";

    while (true) {
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
        "https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2",
        {
          page_params: {
            cid,
            page_type: "detail_operation",
            page_id: "vsite_episode_list",
            id_type: "1",
            page_size: pageSize.toString(),
            lid: "0",
            req_from: "web_mobile",
            page_context: pageContext,
          },
          has_cache: 1,
        },
        {
          headers: {
            Referer: `https://v.qq.com/x/cover/${cid}.html`,
            Cookie: Object.entries({
              pgv_pvid: "40b67e3b06027f3d",
              video_platform: "2",
              vversion_name: "8.2.95",
              video_bucketid: "4",
              video_omgid: "0a1ff6bc9407c0b1cff86ee5d359614d",
            })
              .map((item) => item.join("="))
              .join("; "),
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.statusCode !== 200) {
        throw new Error(`Failed to get Tencent video vid: ${response.statusCode}, ${JSON.stringify(response.data)}`);
      }

      const itemDatas =
        response.data.data?.module_list_datas?.[0]?.module_datas?.[0]?.item_data_lists?.item_datas ?? [];
      if (itemDatas.length >= pageSize) {
        page += 1;
        pageContext = qs.stringify({
          episode_begin: page * pageSize,
          episode_end: (page + 1) * pageSize,
          episode_step: pageSize,
        });
      } else {
        pageContext = "";
      }
      for (const item of itemDatas) {
        if (this.filterItemData(item)) {
          results.push(item.item_params);
        }
      }
      if (!pageContext) {
        break;
      }
    }
    return results;
  }

  private filterItemData(item: TencentVideoItem) {
    const params = item.item_params;

    // 1. 检查是否有 vid
    if (!params.vid) {
      return false;
    }

    // 2. 根据 is_trailer 标志
    if (params.is_trailer === "1") {
      return false;
    }

    // 3. 根据标题中的关键词
    const junkKeywords = ["预告", "彩蛋", "直拍", "直播回顾", "加更", "走心", "解忧", "纯享", "节点"];
    for (const keyword of junkKeywords) {
      if (params.title.includes(keyword)) {
        return false;
      }
    }

    // 4. 根据 union_title 中的关键词
    if (params.union_title?.includes("预告")) {
      return false;
    }

    return true;
  }
}
