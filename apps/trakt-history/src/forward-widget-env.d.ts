/// <reference types='@forward-widget/libs/env' />
namespace BaranwangHistoryTrakt {
  interface GlobalParams {
    /** Trakt Client ID */
    traktClientId: string;
    /** Trakt Client Secret */
    traktClientSecret: string;
  }
}

//#region getDetail
/** Params of 授权 */
interface AuthorizeParams extends BaranwangHistoryTrakt.GlobalParams, BaseDanmuParams, AnimeItem {}

interface AuthorizeReturnType extends Array<GetDetailResponseItem> {}

/**
 * 授权
 * @description 授权
 */
declare let authorize: (params: AuthorizeParams) => AuthorizeReturnType | null | Promise<AuthorizeReturnType | null>;
//#endregion getDetail

//#region searchDanmu
/** Params of 同步播放 */
interface SyncPlayParams extends BaranwangHistoryTrakt.GlobalParams, BaseDanmuParams {}

interface SyncPlayReturnType {
  animes: Array<AnimeItem>;
}

/**
 * 同步播放
 * @description 同步播放
 */
declare let syncPlay: (params: SyncPlayParams) => SyncPlayReturnType | null | Promise<SyncPlayReturnType | null>;
//#endregion searchDanmu
