import { MediaType } from '@forward-widget/shared';
import { WidgetAdaptor } from '@forward-widget/shared/widget-adaptor';
import { expect, rstest, test } from '@rstest/core';
import { IDBridge } from '../src/index';

rstest.stubGlobal('Widget', WidgetAdaptor);

const idBridge = new IDBridge();

test('getTmdbExternalIds', async () => {
  expect(idBridge.getTmdbExternalIds(MediaType.Movie, '1139695')).resolves.toHaveProperty('imdb_id', 'tt5562068');
  expect(idBridge.getTmdbExternalIds(MediaType.TV, '203367')).resolves.toHaveProperty('imdb_id', 'tt28151918');
});

test('imdbToDouban', () => {
  expect(idBridge.imdbToDouban('tt28151918')).resolves.toHaveProperty('doubanId', '35651341');
});

test('doubanToVideoPlatform', () => {
  const result = idBridge.doubanToVideoPlatform('35651341');
  expect(result).resolves.toHaveProperty('mediaType', 'tv');
  expect(result).resolves.toHaveProperty('qq.cid', 'mzc00200iyue5he');
});
