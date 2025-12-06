import { z } from "zod";
import { SeasonType } from "./constants";

export const seasonIndexItemSchema = z.object({
  title: z.string(),
  subTitle: z.string().nullish(),
  season_type: z.enum(SeasonType),
  cover: z.string(),
  first_ep: z
    .object({
      cover: z.string(),
    })
    .nullish(),
  media_id: z.number(),
  season_id: z.number(),
  score: z.coerce.number().nullish().catch(null),
});
