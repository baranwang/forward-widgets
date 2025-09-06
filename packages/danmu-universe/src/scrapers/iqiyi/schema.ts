import { compact } from "es-toolkit";
import { DEFAULT_COLOR_HEX } from "../../libs/constants";
import { z } from "../../libs/zod";
import { providerCommentItemSchema } from "../base";

export const iqiyiIdSchema = z.object({
  /** entity_id / tv_id */
  entityId: z.string(),
});

export type IqiyiId = z.infer<typeof iqiyiIdSchema>;

const iqiyiEpisodeTabDataVideoSchema = z
  .object({
    page_url: z.string(),
    short_display_name: z.string().optional(),
    title: z.string(),
    mark_type_show: z.int().optional(),
  })
  .transform((v) => {
    return {
      ...v,
      get videoId() {
        const match = v.page_url.match(/v_(\S+)\.html/);
        return match?.[1] ?? "";
      },
    };
  });

const safeParseVideo = (data: unknown) => {
  const result = iqiyiEpisodeTabDataVideoSchema.safeParse(data);
  if (!result.success) {
    console.warn("爱奇艺: 解析分集数据时发生错误:", z.prettifyError(result.error), data);
    return null;
  }
  return result.data;
};

const iqiyiTvTabSchema = z.object({
  bk_id: z.literal("selector_bk"),
  bk_type: z.literal("album_episodes"),
  data: z.object({
    data: z
      .array(
        z.unknown().transform(
          (v) =>
            z
              .object({
                videos: z
                  .object({
                    feature_paged: z
                      .record(z.any(), z.array(z.unknown().transform((v) => safeParseVideo(v))))
                      .optional()
                      .transform((v) => compact(Object.values(v ?? {}).flat())),
                  })
                  .optional(),
              })
              .transform((v) => v.videos?.feature_paged)
              .safeParse(v).data,
        ),
      )
      .transform((v) => compact(v.flat())),
  }),
});

const iqiyiMovieTabSchema = z.object({
  bk_id: z.literal("film_feature_bk"),
  bk_type: z.literal("video_list"),
  data: z.object({
    data: z
      .object({
        videos: z.array(z.unknown().transform((v) => safeParseVideo(v))),
      })
      .transform((v) => compact(v.videos)),
  }),
});

export const iqiyiEpisodeTabSchema = z.union([iqiyiTvTabSchema, iqiyiMovieTabSchema]).transform((v) => v.data.data);

export const iqiyiV3ApiResponseSchema = z.object({
  status_code: z.number(),
  data: z
    .object({
      base_data: z.object({
        video_list: z
          .array(
            z.object({
              tv_id: z.string(),
              name: z.string(),
              order: z.number(),
              play_url: z.string(),
            }),
          )
          .optional(),
      }),
      template: z.object({
        tabs: z.array(
          z.object({
            tab_id: z.string(),
            tab_title: z.string(),
            blocks: z.array(
              z.object({
                bk_id: z.string(),
                bk_type: z.string(),
                data: z.unknown().optional(),
              }),
            ),
          }),
        ),
      }),
    })
    .optional(),
});

export const iqiyiVideoBaseInfoResponseSchema = z.object({
  code: z.literal("A00000"),
  data: z.object({
    tvId: z.int(),
    albumId: z.int(),
    durationSec: z.int(),
  }),
});

const iqiyiCommentsEntrySchema = z.object({
  int: z.number(),
  list: z.object({
    bulletInfo: z
      .array(
        z.unknown().transform(
          (v) =>
            z
              .object({
                contentId: z.string(),
                content: z.string(),
                showTime: z.number(),
                color: z
                  .string()
                  .optional()
                  .default(DEFAULT_COLOR_HEX)
                  .transform((v) => parseInt(v, 16)),
              })
              .transform((v) => {
                return providerCommentItemSchema.safeParse({
                  id: v.contentId.toString(),
                  timestamp: v.showTime,
                  color: v.color,
                  content: v.content,
                }).data;
              })
              .safeParse(v).data,
        ),
      )
      .transform((v) => compact(v)),
  }),
});

export const iqiyiCommentsResponseSchema = z
  .object({
    danmu: z.looseObject({
      code: z.literal("A00000"),
      data: z.object({
        entry: z
          .array(z.unknown().transform((v) => iqiyiCommentsEntrySchema.safeParse(v).data?.list.bulletInfo))
          .transform((v) => compact(v.flat())),
      }),
    }),
  })
  .transform((v) => v.danmu.data.entry);
