import type { MediaType } from "../libs/constants";
import { storage, TTL_7_DAYS } from "../libs/storage";

interface TmdbExternalIds {
  imdb_id: string;
  wikidata_id: string;
  facebook_id: string;
  instagram_id: string;
  twitter_id: string;
}

export class TmdbMatcher {
  public async getExternalIds(type: MediaType, tmdbId: string) {
    let externalIds: TmdbExternalIds | null = null;
    const CACHE_KEY = `tmdb:${type}:${tmdbId}:external_ids`;
    const cached = await storage.getJson<TmdbExternalIds>(CACHE_KEY);
    if (cached) {
      externalIds = cached;
    } else {
      externalIds = await Widget.tmdb.get<TmdbExternalIds>(`/${type}/${tmdbId}/external_ids`);
      storage.setJson(CACHE_KEY, externalIds, { ttl: TTL_7_DAYS });
    }
    return externalIds;
  }
}
