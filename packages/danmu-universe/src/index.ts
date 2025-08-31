import type { MediaType } from "./constants";
import { getDoubanInfoByTmdbId } from "./libs/douban";
import { Scraper } from "./scrapers";

// let WidgetMetadata, searchDanmu, getDetail, getComments;

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
  const { tmdbId, type: mediaType } = params;
  console.log("Search danmu", params);

  if (!tmdbId) {
    return { animes: [] };
  }

  const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId);
  return {
    animes: [
      {
        animeId: doubanInfo?.doubanId ?? "",
        animeTitle: doubanInfo?.originResponse?.title ?? "",
      },
    ],
  };
};

getDetail = async (params) => {
  return scraper.getDetailWithDoubanId(params);
};

getComments = async (params) => {
  const { commentId, segmentTime } = params;
  let videoId = commentId;
  if (!videoId) {
    console.log("No video id, get episodes");
    const episodes = await scraper.getDetailWithDoubanId(params);
    videoId = episodes.map((item) => `${item.provider ? `${item.provider}:` : ""}${item.episodeId}`).join(",");
  }
  const comments = await scraper.getDanmuWithSegmentTimeByVideoId(videoId, segmentTime);
  return {
    comments,
    count: comments.length,
  };
};

// if (import.meta.rstest) {
//   const { test, expect, rstest, beforeAll } = import.meta.rstest;

//   beforeAll(async () => {
//     const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
//     rstest.stubGlobal("Widget", WidgetAdaptor);
//   });

//   test("getComments", async () => {
//     const comments = await getComments({ tmdbId: "980477", type: "movie" } as any);
//     expect(comments).toBeDefined();
//     expect(comments.comments.length).toBeGreaterThan(0);
//   });
// }
