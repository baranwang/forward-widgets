import Base64 from "crypto-js/enc-base64";
import HmacSHA256 from "crypto-js/hmac-sha256";
import { qs } from "url-parse";
import { BaseScraper, ProviderEpisodeInfo } from "./base";

const AES_KEY = "3b744389882a4067";
const SIGN_SECRET = "ES513W0B1CsdUrR13Qk5EgDAKPeeKZY";
const BASE_API = "https://api.rrmj.plus";
const CLIENT_TYPE = "web_pc";
const CLIENT_VERSION = "1.0.0";

export class RenRenScraper extends BaseScraper {
  providerName = "renren";

  // protected idSchema = renrenIdSchema;

  constructor() {
    super();
    this.fetch.setHeaders({
      "User-Agent": "Mozilla/5.0",
      Origin: "https://rrsp.com.cn",
      Referer: "https://rrsp.com.cn/",
    });
  }

  async search(params: SearchDanmuParams) {
    return [];
  }

  async getEpisodes(idString: string, episodeNumber?: number) {
    return [];
  }

  async getSegments(idString: string) {
    return [];
  }

  async getComments(idString: string, segmentId: string) {
    return [];
  }

  private generateSignature({
    method,
    aliId,
    timestampMs,
    path,
    sortedQuery,
    secret,
  }: {
    method: string;
    aliId: string;
    timestampMs: number;
    path: string;
    sortedQuery: string;
    secret: string;
  }): string {
    const signStr = [
      method.toUpperCase(),
      `aliId:${aliId}`,
      `ct:${CLIENT_TYPE}`,
      `cv:${CLIENT_VERSION}`,
      `t:${timestampMs}`,
      `${path}?${sortedQuery}`,
    ].join("\n");
    const signature = HmacSHA256(signStr, secret);
    return Base64.stringify(signature);
  }

  private generateHeaders(method: "GET" | "POST", path: string, params: Record<string, any>, deviceId: string) {
    const sortedQuery = qs.stringify(params);
    const now = Date.now();
    const xCaSign = this.generateSignature({
      method: method,
      aliId: deviceId,
      timestampMs: now,
      path,
      sortedQuery: sortedQuery,
      secret: SIGN_SECRET,
    });

    return {
      clientVersion: CLIENT_VERSION,
      deviceId: deviceId,
      clientType: CLIENT_TYPE,
      t: now.toString(),
      aliId: deviceId,
      umid: deviceId,
      token: "",
      cv: CLIENT_VERSION,
      ct: CLIENT_TYPE,
      uet: "9",
      "x-ca-sign": xCaSign,
      Accept: "application/json",
    };
  }
}
