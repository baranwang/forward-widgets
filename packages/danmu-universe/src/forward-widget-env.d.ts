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

//#region getDanmuWithSegmentTime
/** Params of 获取弹幕 */
interface GetDanmuWithSegmentTimeParams extends GlobalParams, BaseDanmuParams, GetDanmuWithSegmentTimeParams {
}

interface GetDanmuWithSegmentTimeReturnType extends GetDanmuWithSegmentTimeResponse {
}

/**
 * 获取弹幕
 * @description 获取弹幕
 */
declare let getDanmuWithSegmentTime: (params: GetDanmuWithSegmentTimeParams) => GetDanmuWithSegmentTimeReturnType | Promise<GetDanmuWithSegmentTimeReturnType>;
//#endregion getDanmuWithSegmentTime
