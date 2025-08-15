import type { MediaType } from "./constants";
import { getDoubanInfoByTmdbId, getVideoPlatformInfoByDoubanId } from "./libs/douban";
import { TencentScraper } from "./scrapers/tencent";
import { YoukuScraper } from "./scrapers/youku";

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
  ],
};

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
  const { animeId, tmdbId, type: mediaType } = params;
  let doubanId = animeId;
  if (!doubanId && tmdbId) {
    const doubanInfo = await getDoubanInfoByTmdbId(mediaType as MediaType, tmdbId);
    doubanId = doubanInfo?.doubanId ?? "";
  }
  if (!doubanId) {
    return [];
  }
  const response = await getVideoPlatformInfoByDoubanId(doubanId.toString());
  console.log(response);
  // if (response.qq) {
  //   const scraper = new TencentScraper();
  //   return scraper.getEpisodes(response.qq.cid);
  // }
  if (response.youku) {
    const scraper = new YoukuScraper();
    return scraper.getEpisodes(response.youku.showId);
  }
  return [];
};

getComments = async (params) => {
  const { commentId } = params;
  const scraper = new TencentScraper();
  const comments = await scraper.getComments(commentId);
  return {
    comments,
    count: comments.length,
  };
};
