import { deleteCookie, getCookie } from "hono/cookie";
import { type FC, useRef } from "hono/jsx";
import { createRoute } from "honox/factory";
import { getTokenFactory } from "../libs/api";
import { COOKIE_NAME, TRAKT_BASE_URL } from "../libs/constants";
import { cookieTransformer, stateTransformer } from "../libs/utils";

const AccessTokenRender: FC<{
  pluginData: string;
}> = ({ pluginData }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="container mx-auto flex h-screen flex-col items-center justify-center p-4">
      <div className="w-full rounded-md border border-white/5 bg-slate-800/40 backdrop-blur-md">
        <textarea
          ref={ref}
          className="w-full resize-none bg-transparent p-2"
          name="pluginData"
          readOnly
          rows={8}
          onFocus={() => {
            ref.current?.select();
          }}
        >
          {pluginData}
        </textarea>
      </div>
      <div className="mt-2 text-sm text-white/50">复制上方内容到 Forward 的模块管理中配置</div>
    </div>
  );
};

export default createRoute(async (c) => {
  const { code, state } = c.req.query();
  const getToken = getTokenFactory(c);

  const cookie = getCookie(c, COOKIE_NAME);
  if (cookie) {
    const cookieData = cookieTransformer.decode(cookie);
    if (cookieData) {
      return getToken({
        grant_type: "refresh_token",
        redirect_uri: cookieData.redirect_uri,
        refresh_token: cookieData.refresh_token,
      }).then((pluginData) => {
        return c.render(<AccessTokenRender pluginData={pluginData} />);
      });
    }
    deleteCookie(c, COOKIE_NAME);
  }

  if (code && state) {
    const stateData = stateTransformer.decode(state);
    if (!stateData) {
      return c.json({ error: "Invalid state" }, 400);
    }
    return getToken({
      grant_type: "authorization_code",
      redirect_uri: stateData.redirect_uri,
      code,
    }).then((pluginData) => {
      return c.render(<AccessTokenRender pluginData={pluginData} />);
    });
  }

  const authUrl = new URL("/oauth/authorize", TRAKT_BASE_URL);
  authUrl.searchParams.set("client_id", c.env.TRAKT_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", c.req.url);
  const status = stateTransformer.encode({ redirect_uri: c.req.url });
  authUrl.searchParams.set("state", status);
  return c.redirect(authUrl.toString());
});
