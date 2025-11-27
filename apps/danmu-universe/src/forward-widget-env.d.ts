/// <reference types='@forward-widget/libs/env' />
namespace BaranwangDanmuUniverse {
  interface GlobalParams {
    /**
     * 模糊匹配
     * @description 是否开启模糊匹配
     * @default 'auto'
     */
    fuzzyMatch: "auto" | "always" | "never";
    /**
     * 360 影视搜索（实验性）
     * @description 是否开启 360 影视搜索
     * @default 'false'
     */
    qihooSearch: "false" | "true";
    /**
     * 未匹配到资源提示
     * @description 是否显示未匹配到资源提示
     * @default 'true'
     */
    emptyAnimeTitle: "true" | "false";
    /**
     * 弹幕内容聚合
     * @default 'true'
     */
    "global.content.aggregation": "true" | "false";
    /** 弹幕内容过滤 */
    "global.content.blacklist": string;
    /**
     * [人人视频] 弹幕模式
     * @description 弹幕模式，精选弹幕相比默认弹幕质量更高
     * @default 'default'
     */
    "provider.renren.mode": "default" | "choice";
    /**
     * 豆瓣书影音档案（实验性）
     * @description 是否开启自动同步豆瓣书影音档案
     * @default 'false'
     */
    "global.experimental.doubanHistory.enabled": "false" | "true";
    /** 豆瓣 Cookie 中的 dbcl2 值 */
    "global.experimental.doubanHistory.dbcl2": string;
    /**
     * 豆瓣自定义评论
     * @default '自豪的使用 Forward*'
     */
    "global.experimental.doubanHistory.customComment": string;
    /**
     * Trakt 历史同步（实验性）
     * @description 是否开启自动同步 Trakt 历史
     * @default 'false'
     */
    "global.experimental.trakt.enabled": "false" | "true";
    /**
     * Trakt 令牌
     * @description 通过 trakt-forward.baranwang.workers.dev 获取
     */
    "global.experimental.trakt.token": string;
  }
}

//#region searchDanmu
/** Params of 搜索弹幕 */
interface SearchDanmuParams extends BaranwangDanmuUniverse.GlobalParams, BaseDanmuParams {}

interface SearchDanmuReturnType {
  animes: Array<AnimeItem>;
}

/**
 * 搜索弹幕
 * @description 搜索弹幕
 */
declare let searchDanmu: (
  params: SearchDanmuParams,
) => SearchDanmuReturnType | null | Promise<SearchDanmuReturnType | null>;
//#endregion searchDanmu

//#region getDetail
/** Params of 获取详情 */
interface GetDetailParams extends BaranwangDanmuUniverse.GlobalParams, BaseDanmuParams, AnimeItem {}

interface GetDetailReturnType extends Array<GetDetailResponseItem> {}

/**
 * 获取详情
 * @description 获取详情
 */
declare let getDetail: (params: GetDetailParams) => GetDetailReturnType | null | Promise<GetDetailReturnType | null>;
//#endregion getDetail

//#region getComments
/** Params of 获取弹幕 */
interface GetCommentsParams extends BaranwangDanmuUniverse.GlobalParams, BaseDanmuParams, EpisodeItem {}

interface GetCommentsReturnType extends GetCommentsResponse {}

/**
 * 获取弹幕
 * @description 获取弹幕
 */
declare let getComments: (
  params: GetCommentsParams,
) => GetCommentsReturnType | null | Promise<GetCommentsReturnType | null>;
//#endregion getComments

//#region getDanmuWithSegmentTime
/** Params of 获取弹幕切片 */
interface GetCommentsParams
  extends BaranwangDanmuUniverse.GlobalParams,
    BaseDanmuParams,
    GetDanmuWithSegmentTimeParams {}

interface GetCommentsReturnType extends GetDanmuWithSegmentTimeResponse {}

/**
 * 获取弹幕切片
 * @description 获取弹幕切片
 */
declare let getComments: (
  params: GetCommentsParams,
) => GetCommentsReturnType | null | Promise<GetCommentsReturnType | null>;
//#endregion getDanmuWithSegmentTime
