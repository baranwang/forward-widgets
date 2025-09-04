import { z } from "zod";
import { Fetch } from "./fetch";

const BASE_URL = "https://api.imdbapi.dev";

const fetch = new Fetch();

const episodesRequestSchema = z.object({
  season: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20),
  pageToken: z.string().optional(),
});

export const getEpisodesByImdbId = async (
  imdbId: string,
  params?: {
    season?: number | string;
    pageSize?: number;
    pageToken?: string;
  },
) => {
  const { season, pageSize, pageToken } = episodesRequestSchema.parse(params ?? {});
  const response = await fetch.get(`${BASE_URL}/titles/${imdbId}/episodes`, {
    params: {
      season,
      pageSize,
      pageToken,
    },
    cache: {
      cacheKey: `imdb:episodes:${imdbId}:${season}:${pageSize}:${pageToken}`,
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
};
