import { MediaType } from '@forward-widget/shared';
import { WidgetAdaptor } from '@forward-widget/shared/widget-adaptor';
import { describe, expect, rstest, test } from '@rstest/core';
import { danmu, idBridge } from '../src';

rstest.stubGlobal('Widget', WidgetAdaptor);

describe('idBridge', () => {
  test('getExternalIdsByTmdbId', async () => {
    const movieResponse = await idBridge.getExternalIdsByTmdbId(MediaType.Movie, '1139695');
    expect(movieResponse).toHaveProperty('imdb_id', 'tt5562068');
    const tvResponse = await idBridge.getExternalIdsByTmdbId(MediaType.TV, '203367');
    expect(tvResponse).toHaveProperty('imdb_id', 'tt28151918');
  });

  test('getDoubanInfoByImdbId', async () => {
    const response = await idBridge.getDoubanInfoByImdbId('tt28151918');
    expect(response).toHaveProperty('doubanId', '35651341');
  });

  test('getVideoPlatformInfoByDoubanId', async () => {
    const result = await idBridge.getVideoPlatformInfoByDoubanId('35651341');
    expect(result).toHaveProperty('mediaType', 'tv');
    expect(result).toHaveProperty('qq.cid', 'mzc00200iyue5he');
  });

  test('getTencentVideoInfoByCid', async () => {
    const result = await idBridge.getTencentVideoInfoByCid('mzc00200iyue5he');
    expect(result.length).toBe(35);
    expect(result[0]).toHaveProperty('vid', 'k410187y6uq');
  });
});

describe('danmu', () => {
  test('getTencentDanmu', async () => {
    const result = await danmu.getTencentDanmu('k410187y6uq');
    console.log(result);
  });
});
