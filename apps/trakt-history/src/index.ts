import { Trakt } from "./trakt";

WidgetMetadata = {
  id: "baranwang.history.trakt",
  title: "Trakt 历史同步",
  description: "Trakt 历史同步",
  author: "Baran",
  version: process.env.PACKAGE_VERSION,
  site: "https://github.com/baranwang/forward-widgets/tree/main/apps/trakt-history",
  requiredVersion: "0.0.2",
  globalParams: [
    {
      title: "Trakt Client ID",
      name: "traktClientId",
      type: "input",
      value: "",
    },
    {
      title: "Trakt Client Secret",
      name: "traktClientSecret",
      type: "input",
      value: "",
    },
  ],

  modules: [
    {
      type: "danmu",
      id: "getDetail",
      title: "授权",
      functionName: "authorize",
      description: "授权",
    },
    {
      type: "danmu",
      id: "searchDanmu",
      title: "同步播放",
      functionName: "syncPlay",
      description: "同步播放",
    },
  ],
};

authorize = async (params) => {
  const trakt = new Trakt(params.traktClientId, params.traktClientSecret);

  let name = "";

  try {
    const profile = await trakt.getProfile();
    name = profile?.name || profile?.username || "";
    await trakt.refreshToken();
    console.log("登录成功", name);
  } catch (error) {}

  if (!name) {
    await trakt.authorize();
    const profile = await trakt.getProfile();
    name = profile?.name || profile?.username || "";
    console.log("登录成功", name);
  }

  return [];
};
