import { MediaType } from "../constants";

export const getExternalIdsByTmdbId = (type: MediaType, tmdbId: string) => {
  return Widget.tmdb.get<{
    imdb_id: string;
    wikidata_id: string;
    facebook_id: string;
    instagram_id: string;
    twitter_id: string;
  }>(`/${type}/${tmdbId}/external_ids`);
};

//#region unit tests

if (import.meta.rstest) {
  const { test, expect, rstest, beforeAll } = import.meta.rstest;

  beforeAll(async () => {
    const { WidgetAdaptor } = await import("@forward-widget/libs/widget-adaptor");
    rstest.stubGlobal("Widget", WidgetAdaptor);
  });

  test("getExternalIdsByTmdbId", async () => {
    const movieResponse = await getExternalIdsByTmdbId(MediaType.Movie, "1139695");
    expect(movieResponse).toHaveProperty("imdb_id", "tt5562068");
    const tvResponse = await getExternalIdsByTmdbId(MediaType.TV, "203367");
    expect(tvResponse).toHaveProperty("imdb_id", "tt28151918");
  });
}

//#endregion
