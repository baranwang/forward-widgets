import type { Context, Env } from "hono";
import { setCookie } from "hono/cookie";
import { COOKIE_NAME } from "./constants";
import { http } from "./http";
import { cookieTransformer } from "./utils";

interface GetTokenBaseParams {
  grant_type: "authorization_code" | "refresh_token";
  redirect_uri: string;
}

interface GetTokenRefreshTokenParams extends GetTokenBaseParams {
  refresh_token: string;
}

interface GetTokenAuthorizationCodeParams extends GetTokenBaseParams {
  code: string;
}

export function getTokenFactory(c: Context<Env>) {
  const { TRAKT_CLIENT_ID: clientId, TRAKT_CLIENT_SECRET: clientSecret } = c.env;
  return async (params: GetTokenAuthorizationCodeParams | GetTokenRefreshTokenParams) => {
    const resp = await http.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      scope: string;
      created_at: number;
    }>("/oauth/token", { ...params, client_id: clientId, client_secret: clientSecret });
    setCookie(
      c,
      COOKIE_NAME,
      cookieTransformer.encode({
        redirect_uri: params.redirect_uri,
        refresh_token: resp.data.refresh_token,
      }),
    );
    const expiresAt = Date.now() + resp.data.expires_in * 1000;
    const token = Buffer.from(
      JSON.stringify({
        access_token: resp.data.access_token,
        expires_at: expiresAt,
      }),
    ).toString("base64");
    return {
      token,
      expiresAt,
    };
  };
}
