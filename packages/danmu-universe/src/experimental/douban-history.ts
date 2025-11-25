import { qs } from "url-parse";
import { Fetch } from "../libs/fetch";
import { Logger } from "../libs/logger";
import { storage } from "../libs/storage";

export class DoubanHistory {
  private fetch = new Fetch();

  private logger = new Logger("DoubanHistory");

  constructor(dbcl2: string) {
    this.fetch.setCookie({ dbcl2 });
  }

  async getCK() {
    const storageKey = "doubanHistory:ck";
    let ck = await storage.get(storageKey);
    if (!ck) {
      await this.fetch.get("https://douban.com");
      ck = this.fetch.getCookie("ck");
      await storage.set(storageKey, ck);
    }
    this.fetch.setCookie({ ck });
    return ck;
  }

  async setStatus(type: "tv" | "movie", doubanId: string, status: "done" | "doing") {
    const ck = await this.getCK();

    const response = await this.fetch.post(
      `https://m.douban.com/rexxar/api/v2/${type}/${doubanId}/${status}`,
      qs.stringify({
        ck,
        tags: "",
        comment: "自豪的使用 Forward",
        sync_douban: 1,
        rating: 0,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: `https://m.douban.com/movie/subject/${doubanId}/`,
        },
      },
    );

    this.logger.info(`设置 ${type} ${doubanId} 状态为 ${status}`, response.data);
  }
}
