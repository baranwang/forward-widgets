/// <reference types='@forward-widget/libs/env' />
interface GlobalParams {
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
declare let searchDanmu: (params: SearchDanmuParams) => SearchDanmuReturnType | Promise<SearchDanmuReturnType>;
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
declare let getDetail: (params: GetDetailParams) => GetDetailReturnType | Promise<GetDetailReturnType>;
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
declare let getComments: (params: GetCommentsParams) => GetCommentsReturnType | Promise<GetCommentsReturnType>;
//#endregion getComments
