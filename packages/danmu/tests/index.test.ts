import { WidgetAdaptor } from '@forward-widget/shared/widget-adaptor';
import { expect, rstest, test } from '@rstest/core';
import { IDBridge } from '../src/index';

rstest.stubGlobal('Widget', WidgetAdaptor);

const idBridge = new IDBridge();

test('imdb2douban', () => {
  expect(idBridge.imdb2douban('tt28151918')).resolves.toHaveProperty('doubanId', '35651341');
});

test('douban2videoPlatform', () => {
  const result = idBridge.douban2videoPlatform('35651341');
  expect(result).resolves.toHaveProperty('mediaType', 'tv');
  expect(result).resolves.toHaveProperty('qq.cid', 'mzc00200iyue5he');
});
