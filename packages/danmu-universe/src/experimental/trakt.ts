import { z } from "zod";
import { Fetch } from "../libs/fetch";
import { storage, TTL_2_HOURS } from "../libs/storage";
import type { GlobalParamsConfig } from "../scrapers/config";

const TRAKT_API_KEY = "7100193031cd53fc7d2ec3eb22fe4162f30f0fb572d18c5b87fa1274c3dab80b";

const paramsSchema = z.union([
  z.object({
    type: z.literal("movie"),
    tmdbId: z.coerce.number(),
  }),
  z.object({
    type: z.literal("tv"),
    tmdbId: z.coerce.number(),
    season: z.coerce.number(),
    episode: z.coerce.number(),
  }),
]);

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

  async syncHistory(params: SearchDanmuParams) {
    const body: Record<string, unknown> = {};

    const { success, data: parsedParams } = paramsSchema.safeParse(params);
    if (!success) {
      return;
    }

    // 利用缓存做一个幂等
    const idempotencyKey = ["trakt", "sync", "history", params.type, params.tmdbId, params.season, params.episode]
      .filter(Boolean)
      .join(":");
    const cached = await storage.get(idempotencyKey);
    if (cached) {
      return;
    }
    await storage.set(idempotencyKey, "1", { ttl: TTL_2_HOURS });

    const watchedAt = new Date().toISOString();
    if (parsedParams.type === "movie") {
      body.movies = [
        {
          watched_at: watchedAt,
          ids: {
            tmdb: parsedParams.tmdbId,
          },
        },
      ];
    }
    if (parsedParams.type === "tv") {
      body.shows = [
        {
          ids: {
            tmdb: parsedParams.tmdbId,
          },
          seasons: [
            {
              number: parsedParams.season,
              episodes: [
                {
                  number: parsedParams.episode,
                  watched_at: watchedAt,
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
