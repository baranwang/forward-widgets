import { deleteCookie, getCookie } from "hono/cookie";
import { createRoute } from "honox/factory";
import { WidgetTokenViewer } from "../islands/widget-token-viewer";
import { getTokenFactory } from "../libs/api";
import { COOKIE_NAME, TRAKT_BASE_URL } from "../libs/constants";
import { cookieTransformer, stateTransformer } from "../libs/utils";

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
      }).then((props) => {
        return c.render(<WidgetTokenViewer {...props} />);
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
    }).then((props) => {
      return c.render(<WidgetTokenViewer {...props} />);
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
