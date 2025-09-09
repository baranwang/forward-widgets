import { qs } from "url-parse";
import { TTL_2_HOURS } from "../../libs/storage";
import { BaseScraper } from "../base";
import {
  type TencentSegmentIndex,
  tencentEpisodeResultSchema,
  tencentIdSchema,
  tencentSegmentIndexSchema,
  tencentSegmentSchema,
} from "./schema";

const pageSize = 100;

export class TencentScraper extends BaseScraper<typeof tencentIdSchema> {
  providerName = "tencent";

  protected idSchema = tencentIdSchema;

  constructor() {
    super();
    this.fetch.setCookie({
      pgv_pvid: "40b67e3b06027f3d",
      video_platform: "2",
      vversion_name: "8.2.95",
      video_bucketid: "4",
      video_omgid: "0a1ff6bc9407c0b1cff86ee5d359614d",
    });
    this.fetch.setHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
  }

  async getEpisodes(idString: string, episodeNumber?: number) {
    const tencentId = this.parseIdString(idString);
    if (!tencentId) {
      return [];
    }
    // 获取指定cid的所有分集列表
    // mediaId 对于腾讯来说就是 cid
    const tencentEpisodes = await this.internalGetEpisodes(tencentId.cid, episodeNumber);

    // 如果指定了目标，则只返回目标分集
    if (episodeNumber !== undefined) {
      return tencentEpisodes.filter((ep) => ep.episodeNumber === episodeNumber);
    }

    return tencentEpisodes;
  }

  async getSegments(idString: string) {
    const tencentId = this.parseIdString(idString);
    if (!tencentId) {
      return [];
    }

    let segmentIndex: TencentSegmentIndex["segment_index"] = {};
    try {
      const response = await this.fetch.get(`https://dm.video.qq.com/barrage/base/${tencentId.vid}`, {
        schema: tencentSegmentIndexSchema,
        cache: {
          cacheKey: `tencent:segment:${tencentId.vid}`,
          ttl: TTL_2_HOURS,
        },
      });

      if (!response.data) {
        return [];
      }

      if (!response.data?.segment_index) {
        this.logger.info("vid：", tencentId.vid, "没有找到弹幕分段索引。");
        return [];
      }
      segmentIndex = response.data.segment_index;
    } catch (e) {
      this.logger.error("获取弹幕索引失败，vid：", tencentId.vid, "错误：", e);
      return [];
    }

    const sortedKeys = Object.keys(segmentIndex).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    this.logger.debug("为 vid：", tencentId.vid, "找到", sortedKeys.length, "个弹幕分段");

    return sortedKeys.map((key) => {
      return {
        provider: this.providerName,
        startTime: parseInt(key, 10) / 1000.0,
        segmentId: segmentIndex[key]?.segment_name,
      };
    });
  }

  async getComments(idString: string, segmentId: string) {
    const tencentId = this.parseIdString(idString);
    if (!tencentId?.vid) {
      return [];
    }
    const response = await this.fetch.get(`https://dm.video.qq.com/barrage/segment/${tencentId.vid}/${segmentId}`, {
      schema: tencentSegmentSchema,
    });
    const comments = response.data?.barrage_list ?? [];
    this.logger.info("找到", comments.length, "条弹幕");
    return comments;
  }

  private async getEpisodesPage(cid: string, page = 0) {
    this.fetch.setHeaders({
      Referer: `https://v.qq.com/x/cover/${cid}.html`,
    });

    const response = await this.fetch.post(
      "https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2",
      {
        page_params: {
          cid,
          page_type: "detail_operation",
          page_id: "vsite_episode_list",
          id_type: "1",
          page_size: pageSize.toString(),
          lid: "0",
          req_from: "web_vsite",
          page_context: qs.stringify({
            cid,
            detail_page_type: "0",
            id_type: "1",
            is_nocopyright: "false",
            is_skp_style: "false",
            list_page_context: `page_context:pg=${page};`,
            page_size: pageSize.toString(),
            req_from: "web_vsite",
            req_from_second_type: "detail_operation",
            req_type: "0",
          }),
        },
        has_cache: 1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        schema: tencentEpisodeResultSchema,
        cache: `tencent:episodes:${cid}:${page}`,
      },
    );
    if (!response.data) {
      return [];
    }
    return response.data.map((item) => {
      const title = item.union_title && item.union_title !== item.title ? item.union_title : item.title;
      return {
        provider: this.providerName,
        episodeId: this.generateIdString({ cid, vid: item.vid }),
        episodeTitle: title,
        episodeNumber: this.getEpisodeIndexFromTitle(title) ?? 0,
      };
    });
  }

  /**
   * 获取指定cid的所有分集列表。
   * 处理了腾讯视频复杂的分页逻辑。
   */
  private async internalGetEpisodes(cid: string, episodeNumber?: number) {
    if (!episodeNumber) {
      return this.getEpisodesPage(cid);
    }

    // 计算当前分集可能在的页码
    const page = Math.floor((episodeNumber ?? 1) / pageSize);
    const episodes = await this.getEpisodesPage(cid, page);
    if (episodes.find((ep) => ep.episodeNumber === episodeNumber)) {
      return episodes;
    }
    const maxEp = Math.max(...episodes.map((ep) => ep.episodeNumber ?? 0));
    const minEp = Math.min(...episodes.map((ep) => ep.episodeNumber ?? 0));
    if (episodeNumber > maxEp) {
      return this.getEpisodesPage(cid, page + 1);
    }
    if (episodeNumber < minEp) {
      return this.getEpisodesPage(cid, page - 1);
    }
    return [];
  }
}

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("tencent", async () => {
    const scraper = new TencentScraper();
    const episodes = await scraper.getEpisodes(scraper.generateIdString({ cid: "53q0eh78q97e4d1" }), 520);
    console.log(episodes);
    // expect(episodes).toBeDefined();
    // expect(episodes.length).toBeGreaterThan(0);

    // const segments = await scraper.getSegments(episodes[0].episodeId);
    // expect(segments).toBeDefined();
    // expect(segments.length).toBeGreaterThan(0);

    // const comments = await scraper.getComments(episodes[0].episodeId, segments[0].segmentId);
    // expect(comments).toBeDefined();
    // expect(comments.length).toBeGreaterThan(0);
  });
}
