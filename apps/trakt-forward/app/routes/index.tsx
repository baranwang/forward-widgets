import { FC } from "hono/jsx";
import { createRoute } from "honox/factory";
import { TRAKT_BASE_URL } from "../libs/constants";
import { brotliCompressSync, brotliDecompressSync } from "node:zlib";

export default createRoute(async (c) => {
  const { code, state } = c.req.query();
  if (code && state) {
    const status = brotliDecompressSync(Buffer.from(state, "base64")).toString();
    const { redirect_uri } = JSON.parse(status);
    const resp= await fetch(new URL("/oauth/token", TRAKT_BASE_URL), {
      method: "POST",
      body: JSON.stringify({
        code,
        client_id: c.env.TRAKT_CLIENT_ID,
        client_secret: c.env.TRAKT_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri,
      }),
    }).then(res=>res.json())
    console.log(resp)
    return c.render(<div>{JSON.stringify(resp)}</div>);
  }

  const authUrl = new URL("/oauth/authorize", TRAKT_BASE_URL);
  authUrl.searchParams.set("client_id", c.env.TRAKT_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", c.req.url);
  const status = brotliCompressSync(
    JSON.stringify({
      redirect_uri: c.req.url,
    }),
  ).toString("base64");
  authUrl.searchParams.set("state", status);
  return c.redirect(authUrl.toString());
});
