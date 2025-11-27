import { Fetch } from "../libs/fetch";
import { z } from "../libs/zod";

const episodesRequestSchema = z.object({
  season: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20),
  pageToken: z.string().optional(),
});

const BASE_URL = "https://api.imdbapi.dev";

export class ImdbMatcher {
  private fetch = new Fetch();

  public async getImdbEpisodes(
    imdbId: string,
    params?: {
      season?: number | string;
      pageSize?: number;
      pageToken?: string;
    },
  ) {
    const { season, pageSize, pageToken } = episodesRequestSchema.parse(params ?? {});
    const response = await this.fetch.get(`${BASE_URL}/titles/${imdbId}/episodes`, {
      params: {
        season,
        pageSize,
        pageToken,
      },
      cache: {
        cacheKey: ["imdb", "episodes", imdbId, season, pageSize, pageToken].filter(Boolean).join(":"),
      },
      successStatus: [200],
      schema: z.object({
        episodes: z.array(
          z.object({
            id: z.string(),
            title: z.string().optional(),
            episodeNumber: z.number().optional(),
          }),
        ),
        totalCount: z.number(),
        nextPageToken: z.string().optional(),
      }),
    });
    return response.data;
  }

  public async getImdbSeasons(imdbId: string) {
    const response = await this.fetch.get(`${BASE_URL}/titles/${imdbId}/seasons`, {
      cache: {
        cacheKey: ["imdb", "seasons", imdbId].join(":"),
      },
      schema: z.object({
        seasons: z.array(
          z.object({
            season: z.string(),
            episodeCount: z.number().optional(),
          }),
        ),
      }),
    });
    return response.data;
  }
}
