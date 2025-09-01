import { type MediaType, PROVIDER_NAMES } from "./constants";
import { getDoubanInfoByTmdbId } from "./libs/douban";
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
  Object.defineProperty(globalThis, "getComments", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

WidgetMetadata = {
  id: "baranwang.danmu.universe",
  title: "通用弹幕",
  description: "通用弹幕获取",
  author: "Baran",
  version: process.env.PACKAGE_VERSION,
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
      id: "getDanmuWithSegmentTime",
      title: "获取弹幕切片",
      functionName: "getComments",
      description: "获取弹幕切片",
    },
  ],
};

const scraper = new Scraper();

searchDanmu = async (params) => {
  const { tmdbId, type: mediaType, episode } = params;
  console.log("Search danmu", params);

  if (!tmdbId) {
    return { animes: [] };
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
        bangumiId: item.episodeId,
        animeTitle,
      };
    }),
  };
};

getComments = async (params) => {
  const { commentId, segmentTime, tmdbId, type: mediaType, episode } = params;
  let videoId = commentId;
  if (!videoId) {
    if (!tmdbId) {
      return { comments: [], count: 0 };
    }
    const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId);
    const episodes = await scraper.getDetailWithDoubanId(doubanInfo?.doubanId ?? "", mediaType as MediaType, episode);
    videoId = episodes.map((item) => [item.provider, item.episodeId].join(":")).join(",");
  }
  const comments = await scraper.getDanmuWithSegmentTimeByVideoId(videoId, segmentTime);
  return {
    comments,
    count: comments.length,
  };
};

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("searchDanmu", async () => {
    const danmu = await searchDanmu({ tmdbId: "253093", type: "tv" } as any);
    expect(danmu).toBeDefined();
    expect(danmu.animes.length).toBeGreaterThan(0);
  });

  test("getComments", async () => {
    const comments = await getComments({ commentId: "iqiyi:5298806780347900" } as any);
    console.log(comments);
    expect(comments).toBeDefined();
    expect(comments.comments.length).toBeGreaterThan(0);
  });
}
