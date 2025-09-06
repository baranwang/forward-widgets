/// <reference types='@forward-widget/libs/env' />
interface GlobalParams {
    /**
     * 模糊匹配
     * @description 是否开启模糊匹配
     * @default 'auto'
     */
    fuzzyMatch: 'auto' | 'always' | 'never';
    /**
     * 未匹配到资源提示
     * @description 是否显示未匹配到资源提示
     * @default 'true'
     */
    emptyAnimeTitle: 'true' | 'false';
    /**
     * [人人视频] 弹幕模式
     * @description 弹幕模式，精选弹幕相比默认弹幕质量更高
     * @default 'default'
     */
    'provider.renren.mode': 'default' | 'choice';
}

//#region searchDanmu
/** Params of 搜索弹幕 */
interface SearchDanmuParams extends GlobalParams, BaseDanmuParams {
}

interface SearchDanmuReturnType {
    animes: Array<AnimeItem>;
}

/**
 * 搜索弹幕
 * @description 搜索弹幕
 */
declare let searchDanmu: (params: SearchDanmuParams) => SearchDanmuReturnType | null | Promise<SearchDanmuReturnType | null>;
//#endregion searchDanmu

//#region getDetail
/** Params of 获取详情 */
interface GetDetailParams extends GlobalParams, BaseDanmuParams, AnimeItem {
}

interface GetDetailReturnType extends Array<GetDetailResponseItem> {
}

/**
 * 获取详情
 * @description 获取详情
 */
declare let getDetail: (params: GetDetailParams) => GetDetailReturnType | null | Promise<GetDetailReturnType | null>;
//#endregion getDetail

//#region getComments
/** Params of 获取弹幕 */
interface GetCommentsParams extends GlobalParams, BaseDanmuParams, EpisodeItem {
}

interface GetCommentsReturnType extends GetCommentsResponse {
}

/**
 * 获取弹幕
 * @description 获取弹幕
 */
declare let getComments: (params: GetCommentsParams) => GetCommentsReturnType | null | Promise<GetCommentsReturnType | null>;
//#endregion getComments

//#region getDanmuWithSegmentTime
/** Params of 获取弹幕切片 */
interface GetCommentsParams extends GlobalParams, BaseDanmuParams, GetDanmuWithSegmentTimeParams {
}

interface GetCommentsReturnType extends GetDanmuWithSegmentTimeResponse {
}

/**
 * 获取弹幕切片
 * @description 获取弹幕切片
 */
declare let getComments: (params: GetCommentsParams) => GetCommentsReturnType | null | Promise<GetCommentsReturnType | null>;
//#endregion getDanmuWithSegmentTime
