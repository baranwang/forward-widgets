import { type MediaType, PROVIDER_NAMES } from "./constants";
import { getDoubanInfoByTmdbId } from "./libs/douban";
import { storage } from "./libs/storage";
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

WidgetMetadata = {
  id: process.env.NODE_ENV === "production" ? "baranwang.danmu.universe" : "baranwang.danmu.universe.test",
  title: process.env.NODE_ENV === "production" ? "通用弹幕" : "通用弹幕 (测试)",
  description: "通用弹幕插件，支持腾讯、优酷、爱奇艺、哔哩哔哩等平台",
  author: "Baran",
  version: process.env.NODE_ENV === "production" ? process.env.PACKAGE_VERSION : `0.0.0-${Date.now()}`,
  site: "https://github.com/baranwang/forward-widgets/tree/main/packages/danmu-universe",
  requiredVersion: "0.0.2",
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
      id: "getComments",
      title: "获取弹幕",
      functionName: "getComments",
      description: "获取弹幕",
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
      id: "getDanmuWithSegmentTime",
      title: "获取弹幕切片",
      functionName: "getComments",
      description: "获取弹幕切片",
    },
  ],
};

const scraper = new Scraper();

searchDanmu = async (params) => {
  storage.cleanup();

  const { tmdbId, type: mediaType, episode } = params;

  if (!tmdbId) {
    return {
      animes: [],
    };
  }

  const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId);

  const episodes = await scraper.getDetailWithDoubanId(doubanInfo?.doubanId ?? "", mediaType as MediaType, episode);

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
  const { animeId, tmdbId, type: mediaType, episode } = params;
  if (!tmdbId && !animeId) {
    return null;
  }
  if (animeId) {
    return scraper.getDetailWithAnimeId(animeId.toString(), mediaType as MediaType, episode);
  }
  const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId ?? "");
  return scraper.getDetailWithDoubanId(doubanInfo?.doubanId ?? "", mediaType as MediaType, episode);
};

getComments = async (params) => {
  const { animeId, commentId, segmentTime, tmdbId, type: mediaType, episode } = params;
  let videoId = commentId ?? animeId;
  if (!videoId) {
    if (!tmdbId) {
      return null;
    }
    const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId);
    const episodes = await scraper.getDetailWithDoubanId(doubanInfo?.doubanId ?? "", mediaType as MediaType, episode);
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

  test("searchDanmu", async () => {
    // const danmu = await searchDanmu({ tmdbId: "1139695", type: "movie" } as SearchDanmuParams);
    const danmu = await searchDanmu({ tmdbId: "50878", type: "tv", episode: "1" } as SearchDanmuParams);
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
