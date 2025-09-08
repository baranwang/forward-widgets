import { compact } from "es-toolkit";
import { reduceRight } from "es-toolkit/compat";
import { DEFAULT_COLOR_INT, MediaType } from "../../libs/constants";
import { z } from "../../libs/zod";
import { CommentMode, providerCommentItemSchema } from "../base";
import { getEpisodeBlacklistPattern } from "../blacklist";

export const mgtvIdSchema = z.object({
  dramaId: z.string(),
  videoId: z.string().optional(),
});
export type MgTVId = z.infer<typeof mgtvIdSchema>;

export const mgtvSearchResponseSchema = z
  .object({
    data: z.object({
      contents: z
        .array(
          z.unknown().transform(
            (v) =>
              z
                .object({
                  type: z.literal("media"),
                  data: z
                    .array(
                      z.unknown().transform(
                        (v) =>
                          z
                            .object({
                              source: z.literal("imgo"),
                              title: z.string().transform((v) => v.replace(/<[^>]*>?/g, "").trim()),
                              url: z.string(),
                              desc: z.array(z.string()),
                            })
                            .transform((v) => {
                              // "/b/339524/9599690.html"
                              const [, , dramaId, videoIdWithExt] = v.url.split("/");
                              const videoId = videoIdWithExt.split(".").shift();
                              return {
                                ...v,
                                dramaId,
                                videoId,
                                get mediaType() {
                                  // "类型: 电影 / 内地 / 2021",
                                  const type = v.desc?.[0].split("/")?.[0].replace("类型:", "").trim();
                                  return type === "电影" ? MediaType.Movie : MediaType.TV;
                                },
                              };
                            })
                            .safeParse(v).data ?? null,
                      ),
                    )
                    .transform((v) => compact(v)),
                })
                .safeParse(v).data?.data ?? null,
          ),
        )
        .transform((v) => compact(v)),
    }),
  })
  .transform((v) => compact(v.data.contents.flat()));

const episodeBlacklistPattern = getEpisodeBlacklistPattern(
  "^(.*?)(抢先(看|版)|加更(版)?|花絮|预告|特辑|(特别|惊喜|纳凉)?企划|彩蛋|专访|幕后(花絮)?|直播|纯享|未播|衍生|番外|合伙人手记|会员(专享|加长)|片花|精华|看点|速看|解读|reaction|超前营业|超前(vlog)?|陪看(记)?|.{3,}篇|影评)(.*?)$",
);

export const mgtvEpisodeInfoResponseSchema = z.object({
  data: z.object({
    tab_m: z
      .array(
        z.object({
          m: z.string(),
        }),
      )
      .catch([]),

    list: z
      .array(
        z.unknown().transform(
          (v) =>
            z
              .object({
                isIntact: z.string(),
                isnew: z.string(),
                video_id: z.string(),
                t1: z.string().refine((v) => !episodeBlacklistPattern.test(v)),
                t2: z.string().refine((v) => !episodeBlacklistPattern.test(v)),
                t3: z.string(),
                time: z.string().transform((v) => {
                  return reduceRight(
                    v.split(":"),
                    (acc, curr, index) => {
                      if (index === 0) {
                        return acc + parseInt(curr);
                      }
                      if (index === 1) {
                        return acc + parseInt(curr) * 60;
                      }
                      return acc + parseInt(curr) * 3600;
                    },
                    0,
                  );
                }),
              })
              .safeParse(v).data ?? null,
        ),
      )
      .transform((v) => compact(v)),
  }),
});

export type MgtvEpisodeInfo = z.infer<typeof mgtvEpisodeInfoResponseSchema>["data"]["list"][number];

export const mgtvCommentConfigResponseSchema = z
  .object({
    status: z.literal(0),
    data: z.object({
      cdn_list: z
        .string()
        .transform((v) => v.split(","))
        .catch(["bullet-ali.hitv.com"]),
      cdn_version: z.string(),
    }),
  })
  .transform((v) => v.data);

const commentColorSchema = z
  .object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
  })
  .transform((v) => v.r * 256 * 256 + v.g * 256 + v.b)
  .catch(-1);

export const mgtvCommentResponseSchema = z
  .object({
    data: z.object({
      items: z
        .array(
          z
            .unknown()
            .transform(
              (v) =>
                z
                  .object({
                    ids: z.string(),
                    content: z.string(),
                    time: z.number().transform((v) => v / 1000),
                    v2_color: z
                      .object({
                        color_left: commentColorSchema,
                        color_right: commentColorSchema,
                      })
                      .optional()
                      .transform((v) => {
                        if (!v) {
                          return DEFAULT_COLOR_INT;
                        }
                        if (v.color_left === -1 && v.color_right === -1) {
                          return DEFAULT_COLOR_INT;
                        }
                        if (v.color_left === -1) {
                          return v.color_right;
                        }
                        if (v.color_right === -1) {
                          return v.color_left;
                        }
                        return (v.color_left + v.color_right) / 2;
                      }),
                    v2_position: z
                      .int()
                      .optional()
                      .transform((v) => {
                        switch (v) {
                          case 1:
                            return CommentMode.TOP;
                          case 2:
                            return CommentMode.BOTTOM;
                          default:
                            return CommentMode.SCROLL;
                        }
                      }),
                  })
                  .safeParse(v).data ?? null,
            )
            .transform((v) => {
              if (!v) {
                return null;
              }
              return (
                providerCommentItemSchema.safeParse({
                  id: v.ids,
                  timestamp: v.time,
                  mode: v.v2_position,
                  color: v.v2_color,
                  content: v.content,
                }).data ?? null
              );
            }),
        )
        .transform((v) => compact(v)),
    }),
  })
  .transform((v) => v.data.items);
