import { MediaType } from "../constants";
import { storage, TTL_7_DAYS } from "./storage";

interface TmdbExternalIds {
  imdb_id: string;
  wikidata_id: string;
  facebook_id: string;
  instagram_id: string;
  twitter_id: string;
}

export const getExternalIdsByTmdbId = async (type: MediaType, tmdbId: string) => {
  let externalIds: TmdbExternalIds | null = null;
  const CACHE_KEY = `tmdb:${type}:${tmdbId}:external_ids`;
  const cached = storage.getJson<TmdbExternalIds>(CACHE_KEY);
  if (cached) {
    externalIds = cached;
  } else {
    externalIds = await Widget.tmdb.get<TmdbExternalIds>(`/${type}/${tmdbId}/external_ids`);
    storage.setJson(CACHE_KEY, externalIds, { ttl: TTL_7_DAYS });
  }
  return externalIds;
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
