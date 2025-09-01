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
declare let getComments: (params: GetCommentsParams) => GetCommentsReturnType | Promise<GetCommentsReturnType>;
//#endregion getDanmuWithSegmentTime
