/// <reference types='@forward-widget/libs/env' />
namespace Nsfw91Porn {
    interface GlobalParams {
        /**
         * 基础 URL
         * @default 'https://91porn.com'
         */
        base_url: string;
    }
}

//#region 91porn.list
/** Params of 🔞 91Porn 视频搜索 */
interface Get91PornListParams extends Nsfw91Porn.GlobalParams {
    /**
     * 分类
     * @description 分类
     * @default 'rf'
     */
    sort_by: 'rf' | 'hot' | 'top' | 'tf' | 'md' | 'top&m=-1' | 'ori' | 'long' | 'longer' | 'hd' | 'mf';
    /**
     * 页码
     * @default '1'
     */
    page: string;
}

/** Return Type of 🔞 91Porn 视频搜索 */
interface Get91PornListReturnType extends Array<VideoItem> {
}

/**
 * 🔞 91Porn 视频搜索
 * @description 🔞 91Porn 视频搜索
 */
declare let get91pornList: (params: Get91PornListParams) => Get91PornListReturnType | null | Promise<Get91PornListReturnType | null>;
//#endregion 91porn.list
namespace NsfwXvideos {
    interface GlobalParams {
    }
}

//#region xvideos.new
/** Params of 最新视频 */
interface GetNewListParams extends NsfwXvideos.GlobalParams {
    /**
     * 地区
     * @default 'cn'
     */
    region: 'cn' | 'id' | 'at' | 'lk' | 'ch' | 'es' | 'dk' | 'gt' | 've' | 'sg' | 'pe' | 'vn' | 'ua' | 'ec' | 'bd' | 'nz' | 'tn' | 'az' | 'ge' | 'tw' | 'pk' | 'jp' | 'jo' | 'af' | 'il' | 'co' | 'br' | 'cl' | 'mm' | 'ar' | 'iq' | 'cm' | 'gr' | 'kh' | 'ro' | 'kr' | 'ru' | 'tz' | 'de' | 'be' | 'us' | 'hk' | 'bg' | 'eg' | 'it' | 'fr' | 'la' | 'my' | 'is' | 'sn' | 'lv' | 'pl' | 'ke' | 'mt' | 'ca' | 'rs' | 'no' | 'th' | 'fi' | 'lb' | 'hu' | 'cy' | 'cz' | 'au' | 'gb' | 'za' | 'mx' | 'md' | 'ie' | 'nl' | 'qa' | 'do' | 'ma' | 'bo' | 'ph' | 'in' | 'ng' | 'sk' | 'se' | 'pt';
    /**
     * 页码
     * @default '0'
     */
    page: string;
}

/** Return Type of 最新视频 */
interface GetNewListReturnType extends Array<VideoItem> {
}

/**
 * 最新视频
 * @description XVideos 最新视频
 */
declare let getNewList: (params: GetNewListParams) => GetNewListReturnType | null | Promise<GetNewListReturnType | null>;
//#endregion xvideos.new

//#region xvideos.channel
/** Params of 频道 */
interface GetChannelListParams extends NsfwXvideos.GlobalParams {
    /** 频道 */
    channel: string;
    /**
     * 页码
     * @default '0'
     */
    page: string;
}

/** Return Type of 频道 */
interface GetChannelListReturnType extends Array<VideoItem> {
}

/**
 * 频道
 * @description XVideos 频道
 */
declare let getChannelList: (params: GetChannelListParams) => GetChannelListReturnType | null | Promise<GetChannelListReturnType | null>;
//#endregion xvideos.channel

//#region xvideos.pornstars
/** Params of 色情明星 */
interface GetPornstarsListParams extends NsfwXvideos.GlobalParams {
    /** 色情明星 */
    pornstar: string;
    /**
     * 页码
     * @default '0'
     */
    page: string;
}

/** Return Type of 色情明星 */
interface GetPornstarsListReturnType extends Array<VideoItem> {
}

/**
 * 色情明星
 * @description XVideos 色情明星
 */
declare let getPornstarsList: (params: GetPornstarsListParams) => GetPornstarsListReturnType | null | Promise<GetPornstarsListReturnType | null>;
//#endregion xvideos.pornstars
