import { type MediaType, PROVIDER_NAMES } from "./libs/constants";
import { getDoubanIds } from "./libs/douban";
import { Scraper } from "./scrapers";

if (import.meta.rstest) {
  Object.defineProperty(globalThis, "WidgetMetadata", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "searchDanmu", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "getDetail", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "getComments", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

const widgetVersion = (() => {
  if (process.env.NODE_ENV === "production") {
    return process.env.PACKAGE_VERSION;
  }
  const date = new Date();
  return `0.0.0-${[date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]
    .map((item) => item.toString().padStart(2, "0"))
    .join("")}`;
})();

WidgetMetadata = {
  id: process.env.NODE_ENV === "production" ? "baranwang.danmu.universe" : "baranwang.danmu.universe.test",
  title: process.env.NODE_ENV === "production" ? "通用弹幕" : "通用弹幕 (测试)",
  description: "通用弹幕插件，支持腾讯、优酷、爱奇艺、哔哩哔哩等平台",
  author: "Baran",
  version: widgetVersion,
  site: "https://github.com/baranwang/forward-widgets/tree/main/packages/danmu-universe",
  requiredVersion: "0.0.2",
  globalParams: [
    {
      title: "模糊匹配",
      name: "fuzzyMatch",
      description: "是否开启模糊匹配",
      value: "auto",
      type: "enumeration",
      enumOptions: [
        {
          title: "自动",
          value: "auto",
        },
        {
          title: "始终开启",
          value: "always",
        },
        {
          title: "始终关闭",
          value: "never",
        },
      ],
    },
  ],
  modules: [
    {
      type: "danmu",
      id: "searchDanmu",
      title: "搜索弹幕",
      functionName: "searchDanmu",
      description: "搜索弹幕",
    },
    {
      type: "danmu",
      id: "getDetail",
      title: "获取详情",
      functionName: "getDetail",
      description: "获取详情",
    },
    {
      type: "danmu",
      id: "getComments",
      title: "获取弹幕",
      functionName: "getComments",
      description: "获取弹幕",
    },
    {
      type: "danmu",
      id: "getDanmuWithSegmentTime",
      title: "获取弹幕切片",
      functionName: "getComments",
      description: "获取弹幕切片",
    },
  ],
};

const scraper = new Scraper();

searchDanmu = async (params) => {
  const { type: mediaType, episode, fuzzyMatch = "auto" } = params;

  let episodes: Array<GetDetailResponseItem & { provider: string }> = [];

  const doubanIds = await getDoubanIds(params);
  if (doubanIds.length) {
    episodes = await scraper.getDetailWithDoubanIds(doubanIds, mediaType as MediaType, episode);
  }

  if ((!episodes?.length && fuzzyMatch === "auto") || fuzzyMatch === "always") {
    const searchEpisodes = await scraper.getDetailWithSearchParams(params);
    episodes = episodes.concat(searchEpisodes);
  }

  if (!episodes.length) {
    return {
      animes: [
        {
          animeId: "empty",
          animeTitle: process.env.NODE_ENV === "development" ? JSON.stringify(params) : "😭 未匹配到资源",
        },
      ],
    };
  }
  return {
    animes: episodes.map((item) => {
      let animeTitle = `[${PROVIDER_NAMES[item.provider]}] `;
      if (item.episodeTitle) {
        animeTitle += item.episodeTitle;
      }
      return {
        animeId: item.episodeId,
        animeTitle,
      };
    }),
  };
};

getDetail = async (params) => {
  const { animeId, type: mediaType, episode } = params;
  if (!animeId) {
    return null;
  }
  return scraper.getDetailWithAnimeId(animeId.toString(), mediaType as MediaType, episode);
};

getComments = async (params) => {
  const { animeId, commentId, segmentTime, tmdbId, type: mediaType, episode } = params;
  let videoId = commentId ?? animeId;
  if (!videoId) {
    if (!tmdbId) {
      return null;
    }
    const doubanIds = await getDoubanIds(params);
    if (!doubanIds.length) {
      return null;
    }
    const episodes = await scraper.getDetailWithDoubanIds(doubanIds, mediaType as MediaType, episode);
    videoId = episodes.map((item) => [item.provider, item.episodeId].join(":")).join(",");
  }
  const comments = await scraper.getDanmuWithSegmentTimeByVideoId(videoId.toString(), segmentTime);
  return {
    comments,
    count: comments.length,
  };
};

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test.only("searchDanmu", async () => {
    // const danmu = await searchDanmu({ tmdbId: "1139695", type: "movie" } as SearchDanmuParams);
    const danmu = await searchDanmu({
      // tmdbId: "119051",
      seriesName: "星期三",
      type: "tv",
      season: "2",
      episode: "4",
    } as SearchDanmuParams);
    console.log(danmu);
    expect(danmu).toBeDefined();
    expect(danmu?.animes.length).toBeGreaterThan(0);
  });

  // test("getComments", async () => {
  //   const comments = await getComments({ commentId: "iqiyi:5298806780347900" } as GetCommentsParams);
  //   console.log(comments);
  //   expect(comments).toBeDefined();
  //   expect(comments?.comments.length).toBeGreaterThan(0);
  // });
}
