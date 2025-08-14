import md5 from "crypto-js/md5";
import * as z from "zod/mini";
import { BaseScraper, type ProviderEpisodeInfo } from "./base";

const youkuEpisodeInfoSchema = z.pipe(
  z.object({
    id: z.string(),
    title: z.string(),
    duration: z.string(),
    category: z.string(),
    link: z.string(),
  }),
  z.transform((data) => {
    return {
      ...data,
      get totalMat(): number {
        try {
          const durationFloat = parseFloat(data.duration);
          return Math.floor(durationFloat / 60) + 1;
        } catch {
          return 0;
        }
      },
    };
  }),
);

const youkuVideoResultSchema = z.object({
  total: z.number(),
  videos: z.array(youkuEpisodeInfoSchema),
});

type YoukuEpisodeInfo = z.infer<typeof youkuEpisodeInfoSchema>;

export class YoukuScraper extends BaseScraper {
  providerName = "youku";

  private readonly EPISODE_BLACKLIST_KEYWORDS = ["彩蛋", "加更", "走心", "解忧", "纯享"];

  private token = "";
  private cna = "";

  async getEpisodes(mediaId: string, episodeNumber?: number) {
    const allEpisodes: YoukuEpisodeInfo[] = [];
    let page = 1;
    const pageSize = 20;
    let totalEpisodes = 0;

    while (true) {
      try {
        const pageResult = await this.getEpisodesPage(mediaId, page, pageSize);

        if (!pageResult || !pageResult.videos || pageResult.videos.length === 0) {
          break;
        }

        // 第一页时获取总数
        if (page === 1 && pageResult.total) {
          totalEpisodes = pageResult.total;
        }

        // 过滤黑名单关键词
        const filteredVideos = pageResult.videos.filter(
          (video) => !this.EPISODE_BLACKLIST_KEYWORDS.some((keyword) => video.title.includes(keyword)),
        );

        allEpisodes.push(...filteredVideos);

        // 检查是否已获取所有分集或当前页数据不足
        if (allEpisodes.length >= totalEpisodes || pageResult.videos.length < pageSize) {
          break;
        }

        // 如果指定了目标分集且已找到足够数量，停止分页
        if (episodeNumber && allEpisodes.length >= episodeNumber) {
          break;
        }

        page++;
        await this.sleep(300); // 300ms延时
      } catch (error) {
        console.error(`Youku: Failed to get episodes page ${page} for media_id ${mediaId}:`, error);
        break;
      }
    }

    // 转换为ProviderEpisodeInfo格式
    const providerEpisodes = allEpisodes.map<ProviderEpisodeInfo>((ep, i) => ({
      provider: this.providerName,
      episodeId: ep.id,
      episodeTitle: ep.title,
      episodeNumber: i + 1,
      url: ep.link,
    }));

    // 如果指定了目标分集，只返回该分集
    if (episodeNumber !== undefined) {
      const targetEpisode = providerEpisodes.find((ep) => ep.episodeNumber === episodeNumber);
      return targetEpisode ? [targetEpisode] : [];
    }

    return providerEpisodes;
  }

  async getComments(episodeId: string) {
    try {
      const response = await this.fetch.get("https://openapi.youku.com/v2/videos/show_basic.json", {
        params: {
          client_id: "53e6cc67237fc59a",
          package: "com.huawei.hwvplayer.youku",
          video_id: episodeId,
        },
      });
      const { success, data } = youkuEpisodeInfoSchema.safeParse(response.data);
      if (!success) {
        return [];
      }
      if (!data.totalMat) {
        return [];
      }
      const allComments = [];
    } catch (error) {}
    return [];
  }

  private async getEpisodesPage(showId: string, page: number, pageSize: number) {
    const response = await this.fetch.get("https://openapi.youku.com/v2/shows/videos.json", {
      params: {
        client_id: "53e6cc67237fc59a",
        package: "com.huawei.hwvplayer.youku",
        ext: "show",
        show_id: showId,
        page: page.toString(),
        count: pageSize.toString(),
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP error! status: ${response.statusCode}`);
    }

    return youkuVideoResultSchema.parse(response.data);
  }

  private async getDanmuContentByMat(vid: string, mat: number) {
    if (!this.token) {
      console.error("Youku: Cannot get danmaku, _m_h5_tk is missing.");
      return [];
    }

    const ctime = Date.now();
    const msg: Record<string, any> = {
      pid: 0,
      ctype: 10004,
      sver: "3.1.0",
      cver: "v1.0",
      ctime: ctime,
      guid: this.cna,
      vid: vid,
      mat: mat,
      mcount: 1,
      type: 1,
    };

    const msgOrderedStr = JSON.stringify(Object.fromEntries(Object.entries(msg).sort()), null, 0);
    const msgEnc = Buffer.from(msgOrderedStr, "utf-8").toString("base64");

    msg.msg = msgEnc;
    msg.sign = this.generateMsgSign(msgEnc);

    const appKey = "24679788";
    const dataPayload = JSON.stringify(msg);
    const t = Date.now().toString();

    const params = new URLSearchParams({
      jsv: "2.7.0",
      appKey: appKey,
      t: t,
      sign: this.generateTokenSign(t, appKey, dataPayload),
      api: "mopen.youku.danmu.list",
      v: "1.0",
      type: "originaljson",
      dataType: "jsonp",
      timeout: "20000",
      jsonpIncPrefix: "utility",
    });

    const url = `https://acs.youku.com/h5/mopen.youku.danmu.list/1.0/?${params.toString()}`;

    const response = await this.fetch.post(url, {
      data: { data: dataPayload },
      headers: { Referer: "https://v.youku.com" },
    });
  }

  private generateMsgSign(msgEnc: string) {
    return md5(`${msgEnc}MkmC9SoIw6xCkSKHhJ7b5D2r51kBiREr`).toString().toLowerCase();
  }

  private generateTokenSign(t: string, appKey: string, dataPayload: string) {
    return md5([this.token, t, appKey, dataPayload].join("&")).toString().toLowerCase();
  }
}
