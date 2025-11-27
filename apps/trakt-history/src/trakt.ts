import { Fetch } from "@forward-widget/libs-fetch";
import { storage } from "@forward-widget/libs-storage";
import { z } from "zod";
import { accessTokenSchema, deviceCodeSchema } from "./schema";

const TRAKT_BASE_URL = "https://api.trakt.tv";

export class Trakt {
  private readonly fetch = new Fetch();

  private static TOKEN_STORAGE_KEY = "trakt:token";

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    this.fetch.setHeaders({
      "Content-Type": "application/json",
      "trakt-api-key": this.clientId,
      "trakt-api-version": "2",
    });
  }

  async authorize() {
    const resp = await this.fetch.post(
      `${TRAKT_BASE_URL}/oauth/device/code`,
      {
        client_id: this.clientId,
      },
      {
        schema: deviceCodeSchema,
      },
    );

    if (!resp.data) {
      throw new Error("Failed to generate device code");
    }
    console.log(
      "你的验证码为：",
      resp.data.userCode,
      "请在浏览器中打开以下链接",
      [resp.data.verificationUrl, resp.data.userCode].join("/"),
    );
    const result = await this.pollForAccessToken(resp.data);
    if (!result.success) {
      throw new Error(result.message);
    }

    await storage.setJson(Trakt.TOKEN_STORAGE_KEY, result.data);

    return result.data;
  }

  async getProfile() {
    const tokenData = await this.getAccessToken();
    if (!tokenData) {
      throw new Error("未找到授权信息");
    }
    const resp = await this.fetch.get(`${TRAKT_BASE_URL}/users/settings`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
        "trakt-api-key": this.clientId,
        "trakt-api-version": "2",
      },
      schema: z.object({
        username: z.string().optional(),
        name: z.string().optional(),
      }),
    });
    return resp.data;
  }

  async getAccessToken() {
    let tokenData = await storage.getJson<z.output<typeof accessTokenSchema>>(Trakt.TOKEN_STORAGE_KEY);
    if (!tokenData) {
      throw new Error("未找到授权信息");
    }
    // 如果过期时间小于 3 天则刷新 token
    if (tokenData.expiresAt < Date.now() + 3 * 24 * 60 * 60 * 1000) {
      tokenData = await this.refreshToken();
    }
    return tokenData;
  }

  private async pollForAccessToken(params: z.output<typeof deviceCodeSchema>) {
    const now = Date.now();
    while (params.expiresAt > now) {
      await new Promise((resolve) => setTimeout(resolve, params.interval * 1000));

      const resp = await this.fetch.post(`${TRAKT_BASE_URL}/oauth/device/token`, {
        code: params.deviceCode,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
      const { success, data } = accessTokenSchema.safeParse(resp.data);
      if (success) {
        return {
          success,
          data,
        };
      }
    }
    return {
      success: false,
      data: null,
      message: "授权超时",
    };
  }

  async refreshToken() {
    const tokenData = await storage.getJson<z.output<typeof accessTokenSchema>>(Trakt.TOKEN_STORAGE_KEY);
    if (!tokenData) {
      throw new Error("未找到授权信息");
    }

    const resp = await this.fetch.post(
      `${TRAKT_BASE_URL}/oauth/token`,
      {
        grant_type: "refresh_token",
        refresh_token: tokenData.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
      },
      { schema: accessTokenSchema },
    );

    await storage.setJson(Trakt.TOKEN_STORAGE_KEY, resp.data);

    return resp.data;
  }
}
