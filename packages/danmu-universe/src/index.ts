import { DoubanHistory } from "./experimental/douban-history";
import { Trakt } from "./experimental/trakt";
import { EMPTY_ANIME_CONFIG, type MediaType, PROVIDER_NAMES } from "./libs/constants";
import { z } from "./libs/zod";
import { DoubanMatcher } from "./matchers/douban";
import { type GetEpisodeParam, scraper } from "./scrapers";

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
  id: "baranwang.danmu.universe",
  title: process.env.NODE_ENV === "production" ? "通用弹幕" : "通用弹幕 (测试)",
  description: "通用弹幕插件，支持腾讯、优酷、爱奇艺、哔哩哔哩、人人视频等平台",
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
    {
      title: "360 影视搜索（实验性）",
      name: "qihooSearch",
      description: "是否开启 360 影视搜索",
      value: "false",
      type: "enumeration",
      belongTo: {
        paramName: "fuzzyMatch",
        value: ["auto", "always"],
      },
      enumOptions: [
        {
          title: "关闭",
          value: "false",
        },
        {
          title: "开启",
          value: "true",
        },
      ],
    },
    {
      title: "未匹配到资源提示",
      name: "emptyAnimeTitle",
      description: "是否显示未匹配到资源提示",
      value: "true",
      type: "enumeration",
      enumOptions: [
        {
          title: "开启",
          value: "true",
        },
        {
          title: "关闭",
          value: "false",
        },
      ],
    },
    {
      title: "弹幕内容聚合",
      name: "global.content.aggregation",
      value: "true",
      type: "enumeration",
      enumOptions: [
        {
          title: "开启",
          value: "true",
        },
        {
          title: "关闭",
          value: "false",
        },
      ],
    },
    {
      title: "弹幕内容过滤",
      name: "global.content.blacklist",
      value: "",
      type: "input",
    },
    {
      title: `[${PROVIDER_NAMES.renren}] 弹幕模式`,
      name: "provider.renren.mode",
      description: "弹幕模式，精选弹幕相比默认弹幕质量更高",
      value: "default",
      type: "enumeration",
      enumOptions: [
        {
          title: "默认",
          value: "default",
        },
        {
          title: "精选",
          value: "choice",
        },
      ],
    },
    {
      title: "豆瓣书影音档案（实验性）",
      name: "global.experimental.doubanHistory.enabled",
      description: "是否开启自动同步豆瓣书影音档案",
      value: "false",
      type: "enumeration",
      enumOptions: [
        {
          title: "关闭",
          value: "false",
        },
        {
          title: "开启",
          value: "true",
        },
      ],
    },
    {
      title: "豆瓣 Cookie 中的 dbcl2 值",
      name: "global.experimental.doubanHistory.dbcl2",
      value: "",
      type: "input",
      belongTo: {
        paramName: "global.experimental.doubanHistory.enabled",
        value: ["true"],
      },
    },
    {
      title: "豆瓣自定义评论",
      name: "global.experimental.doubanHistory.customComment",
      value: "自豪的使用 Forward*",
      type: "input",
      belongTo: {
        paramName: "global.experimental.doubanHistory.enabled",
        value: ["true"],
      },
      placeholders: ["自豪的使用 Forward*", "Marked by Forward*"].map((item) => ({
        title: item,
        value: item,
      })),
    },

    {
      title: "Trakt 历史同步（实验性）",
      name: "global.experimental.trakt.enabled",
      description: "是否开启自动同步 Trakt 历史",
      value: "false",
      type: "enumeration",
      enumOptions: [
        {
          title: "关闭",
          value: "false",
        },
        {
          title: "开启",
          value: "true",
        },
      ],
    },
    {
      title: "Trakt 令牌",
      description: "通过 trakt-forward.baranwang.workers.dev 获取",
      name: "global.experimental.trakt.token",
      value: "",
      type: "input",
      belongTo: {
        paramName: "global.experimental.trakt.enabled",
        value: ["true"],
      },
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

const checkShowEmptyAnimeTitle = (params: SearchDanmuParams) => {
  if (import.meta.rstest) {
    return false;
  }
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return z.stringbool().catch(true).parse(params.emptyAnimeTitle);
};

searchDanmu = async (params) => {
  const globalParams = scraper.setGlobalParams(params);

  const { fuzzyMatch = "auto", type: mediaType, episode } = params;

  let episodesParams: GetEpisodeParam[] = [];

  const doubanMatcher = new DoubanMatcher();
  const { doubanIds, videoPlatformInfo } = await doubanMatcher.getEpisodeParams(params);
  episodesParams = episodesParams.concat(videoPlatformInfo);

  try {
    if (globalParams?.global.experimental.trakt.enabled && globalParams?.global.experimental.trakt.token) {
      const trakt = new Trakt(globalParams.global.experimental.trakt);
      await trakt.syncHistory(params);
    }
  } catch (error) {
    console.error(error);
  }

  try {
    if (
      globalParams?.global.experimental.doubanHistory.enabled &&
      globalParams?.global.experimental.doubanHistory.dbcl2
    ) {
      const doubanHistory = new DoubanHistory(globalParams.global.experimental.doubanHistory);
      if (doubanIds.length === 1) {
        await doubanHistory.setStatus(mediaType, doubanIds[0], mediaType === "tv" ? "doing" : "done");
      }
    }
  } catch (error) {
    console.error(error);
  }

  if ((!episodesParams?.length && fuzzyMatch === "auto") || fuzzyMatch === "always") {
    const searchEpisodes = await scraper.getEpisodeParams(params);
    episodesParams = episodesParams.concat(searchEpisodes);
  }

  if (mediaType === "tv") {
    episodesParams = episodesParams.map((item) => ({
      ...item,
      episodeNumber: episode ? parseInt(episode, 10) : undefined,
    }));
  }

  let episodes = await scraper.getEpisodes(...episodesParams);

  if (mediaType === "tv" && episode) {
    episodes = episodes.filter((item) => item.episodeNumber === parseInt(episode, 10));
  }

  if (!episodes.length && checkShowEmptyAnimeTitle(params)) {
    return {
      animes: [
        {
          animeId: EMPTY_ANIME_CONFIG.ID,
          animeTitle: process.env.NODE_ENV === "development" ? JSON.stringify(params) : EMPTY_ANIME_CONFIG.TITLE,
        },
      ],
    };
  }
  return {
    animes: episodes.map((item) => {
      let animeTitle = `[${PROVIDER_NAMES[item.provider as keyof typeof PROVIDER_NAMES]}] `;
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
  scraper.setGlobalParams(params);

  const { animeId, type: mediaType, episode } = params;
  if (!animeId || animeId === EMPTY_ANIME_CONFIG.ID) {
    return null;
  }

  return scraper.getDetailWithAnimeId(animeId.toString(), mediaType as MediaType, episode);
};

getComments = async (params) => {
  scraper.setGlobalParams(params);

  const { animeId, commentId, segmentTime } = params;
  const videoId = commentId ?? animeId;
  if (videoId === EMPTY_ANIME_CONFIG.ID) {
    return null;
  }
  const comments = await scraper.getDanmuWithSegmentTimeByVideoId(videoId.toString(), segmentTime);
  return {
    comments,
    count: comments.length,
  };
};

if (import.meta.rstest) {
  const { test, expect, describe, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    Widget.storage.clear();
  });

  describe("searchDanmu", async () => {
    test.each([
      {
        tmdbId: "30983",
        seriesName: "名侦探柯南",
        type: "tv",
        season: "1",
        episode: "520",
      },
      {
        tmdbId: "980477",
        seriesName: "哪吒之魔童闹海",
        type: "movie",
        season: "1",
        episode: "1",
      },
      {
        tmdbId: "243083",
        seriesName: "国色芳华",
        type: "tv",
        season: "2",
        episode: "20",
      },
      {
        tmdbId: "242762",
        seriesName: "子夜归",
        type: "tv",
        season: "1",
        episode: "24",
      },
    ] as Partial<SearchDanmuParams>[])("$seriesName", async (params) => {
      const result = await searchDanmu(params as SearchDanmuParams);
      expect(result).toBeDefined();
      expect(result?.animes.length).toBeGreaterThan(0);
      console.log(params.seriesName, result?.animes);
    });
  });
}
