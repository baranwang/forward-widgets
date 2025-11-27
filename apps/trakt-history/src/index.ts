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
      id: "searchDanmu",
      title: "同步播放",
      functionName: "syncPlay",
      description: "同步播放",
    },
  ],
};
