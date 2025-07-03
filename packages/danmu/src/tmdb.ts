import { MediaType } from '@forward-widget/shared';

export const getExternalIdsByTmdbId = async (type: MediaType, tmdbId: string) => {
  const response = await Widget.tmdb.get<{
    imdb_id: string;
    wikidata_id: string;
    facebook_id: string;
    instagram_id: string;
    twitter_id: string;
  }>(`/3/${type}/${tmdbId}/external_ids`);
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get external IDs: ${response.statusCode}, ${JSON.stringify(response.data)}`);
  }
  return response.data;
};

//#region unit tests

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import('@forward-widget/shared/widget-adaptor');
    rstest.stubGlobal('Widget', WidgetAdaptor);
  });

  test('getExternalIdsByTmdbId', async () => {
    const movieResponse = await getExternalIdsByTmdbId(MediaType.Movie, '1139695');
    expect(movieResponse).toHaveProperty('imdb_id', 'tt5562068');
    const tvResponse = await getExternalIdsByTmdbId(MediaType.TV, '203367');
    expect(tvResponse).toHaveProperty('imdb_id', 'tt28151918');
  });
}

//#endregion
