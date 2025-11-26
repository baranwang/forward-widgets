import { Fetch } from "../libs/fetch";
import type { GlobalParamsConfig } from "../scrapers/config";

const TRAKT_API_KEY = "7100193031cd53fc7d2ec3eb22fe4162f30f0fb572d18c5b87fa1274c3dab80b";

export class Trakt {
  private readonly fetch = new Fetch();

  constructor(config: GlobalParamsConfig["global"]["experimental"]["trakt"]) {
    this.fetch.setHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token?.access_token}`,
      "trakt-api-key": TRAKT_API_KEY,
      "trakt-api-version": "2",
    });
  }

  syncHistory(params: SearchDanmuParams) {
    const body: Record<string, unknown> = {};
    if (!params.tmdbId) {
      return;
    }
    if (params.type === "movie") {
      body.movies = [
        {
          watched_at: new Date().toISOString(),
          ids: {
            tmdb: parseInt(params.tmdbId, 10),
          },
        },
      ];
    }
    if (params.type === "tv" && params.season && params.episode) {
      body.shows = [
        {
          ids: {
            tmdb: parseInt(params.tmdbId, 10),
          },
          seasons: [
            {
              number: parseInt(params.season, 10),
              episodes: [
                {
                  number: parseInt(params.episode, 10),
                  watched_at: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ];
    }
    return this.fetch.post("https://api.trakt.tv/sync/history", body);
  }
}
