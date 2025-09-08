import { compact } from "es-toolkit";
import { WidgetAPI } from "./utils";

const DEFAULT_BASE_URL = "https://91porn.com";

const widgetAPI = new WidgetAPI();

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
  id: "nsfw.91porn",
  title: "91Porn",
  description: "🔞 91Porn 视频搜索",
  author: "匿名",
  version: widgetVersion,
  requiredVersion: "0.0.1",
  site: "https://github.com/baranwang/forward-widgets/tree/main/packages/nsfw",
  detailCacheDuration: 1,
  globalParams: [
    {
      name: "base_url",
      title: "基础 URL",
      type: "input",
      value: DEFAULT_BASE_URL,
    },
  ],
  modules: [
    {
      id: "91porn.list",
      title: "🔞 91Porn 视频搜索",
      description: "🔞 91Porn 视频搜索",
      cacheDuration: 3600,
      requiresWebView: false,
      functionName: "get91pornList",
      params: [
        {
          name: "sort_by",
          title: "分类",
          description: "分类",
          type: "enumeration",
          value: "rf",
          enumOptions: [
            { value: "rf", title: "最近加精" },
            { value: "hot", title: "当前最热" },
            { value: "top", title: "本月最热" },
            { value: "tf", title: "本月收藏" },
            { value: "md", title: "本月讨论" },
            { value: "top&m=-1", title: "上月最热" },
            { value: "ori", title: "91原创" },
            { value: "long", title: "10分钟以上 " },
            { value: "longer", title: "20分钟以上 " },
            { value: "hd", title: "高清" },
            { value: "mf", title: "收藏最多" },
          ],
        },
        {
          name: "page",
          title: "页码",
          type: "page",
          value: "1",
        },
      ],
    },
  ],
};

get91pornList = async (params) => {
  params.sort_by ||= "ori";
  params.page ||= "1";
  params.base_url ||= DEFAULT_BASE_URL;

  try {
    const $ = await widgetAPI.getHtml(
      `${params.base_url}/v.php?category=${params.sort_by}&viewtype=basic&page=${params.page}`,
    );
    if (!$) {
      return [];
    }

    const list = Array.from($(".videos-text-align")).map<VideoItem | null>((el) => {
      const $el = $(el);
      const $parent = $el.closest(".col-lg-8");
      if ($parent.length > 0) {
        console.debug("跳过蜜罐");
        return null;
      }

      const link = $el.find("a").attr("href");
      if (!link) {
        console.debug("跳过没有链接的元素");
        return null;
      }

      const backdropPath = $el.find(".img-responsive").attr("src");

      const result: VideoItem = {
        id: link,
        type: "url",
        mediaType: "movie",
        link,
        title: $el.find(".video-title").text().trim(),
        backdropPath,
      };

      try {
        result.durationText = $el.find(".duration").text().trim();
      } catch (error) {}

      try {
        const videoID = backdropPath?.split("/").pop()?.split(".").shift();
        if (videoID) {
          result.previewUrl = `https://vthumb.killcovid2021.com/thumb/${videoID}.mp4`;
        }
      } catch (error) {}

      try {
        const addTimeEl = $el.find(".info").filter((_, el) => $(el).text().includes("添加时间"));
        const nextSibling = addTimeEl[0]?.nextSibling;
        const addTime = nextSibling && "textContent" in nextSibling ? nextSibling.textContent : undefined;
        if (addTime && typeof addTime === "string") {
          result.releaseDate = addTime.trim();
        }
      } catch (error) {}

      return result;
    });

    return compact(list);
  } catch (error) {
    console.error("Failed to get 91porn list", error);
    return [];
  }
};

type LoadDetailReturnType = Omit<VideoItem, "videoUrl"> & Pick<Required<VideoItem>, "videoUrl">;

loadDetail = async (url) => {
  try {
    const $ = await widgetAPI.getHtml(url);
    if (!$) {
      throw new Error("未找到视频资源");
    }
    const player = $("#player_one");
    const script = player.find("script").text();
    const sourceHtml = decodeURIComponent(script.match(/strencode2\("(.*?)"\)/)?.[1] || "");
    const $source = await Widget.html.load(sourceHtml);
    const videoUrl = $source("source").attr("src");
    if (!videoUrl) {
      throw new Error("未找到视频资源");
    }

    const result: LoadDetailReturnType = {
      id: url,
      type: "detail",
      mediaType: "movie",
      link: url,
      title: $("#videodetails h4").first().text().trim(),
      backdropPath: player.attr("poster"),
      videoUrl,
    };

    try {
      const duration = $("#useraction")
        .find(".info")
        .filter((_, el) => $(el).text().includes("时长"))
        .find(".video-info-span")
        .text()
        .trim();
      if (duration) {
        result.durationText = duration;
      }
    } catch (error) {}

    try {
      const releaseDate = $(".title-yakov").eq(0).text();
      if (releaseDate) {
        result.releaseDate = releaseDate;
      }
    } catch (error) {}

    try {
      const description = (
        await Widget.html.load(
          $("#v_desc")
            .html()!
            .replace(/<br\s*\/?>/g, "\n"),
        )
      ).text();
      if (description) {
        result.description = description;
      }
    } catch (error) {}

    try {
      result.childItems = compact(
        Array.from($(".well")).map((el) => {
          const $el = $(el);
          const link = $el.find("a").attr("href");
          if (!link) {
            return null;
          }
          const title = $el.find(".video-title").text().trim();
          const durationText = $el.find(".duration").text().trim();
          return {
            id: link,
            type: "url",
            mediaType: "movie",
            link,
            title,
            durationText,
            backdropPath: $el.find(".img-responsive").attr("src"),
          } as VideoItemChild;
        }),
      );
    } catch (error) {}

    return result;
  } catch (error) {
    console.error("Failed to load detail", error);
    return null as unknown as LoadDetailReturnType;
  }
};
