import type { MediaType } from "./constants";
import { getDoubanInfoByTmdbId } from "./libs/douban";
import { Scraper } from "./scrapers";

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
      id: "getDanmuWithSegmentTime",
      title: "获取弹幕",
      functionName: "getDanmuWithSegmentTime",
      description: "获取弹幕",
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

getDanmuWithSegmentTime = async (params) => {
  const { commentId, segmentTime } = params;
  let videoId = commentId;
  if (!videoId) {
    console.log("No video id, get episodes");
    const episodes = await scraper.getDetailWithDoubanId(params);
    videoId = episodes.map((item) => `${item.provider}:${item.episodeId}`).join(",");
  }
  console.log("Video id", videoId);
  const comments = await scraper.getDanmuWithSegmentTimeByVideoId(videoId, segmentTime);
  return {
    comments,
    count: comments.length,
  };
};
