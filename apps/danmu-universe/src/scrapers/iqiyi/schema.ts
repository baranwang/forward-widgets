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
    const videoId = v.page_url.match(/v_(\S+)\.html/)?.[1] ?? "";
    return {
      ...v,
      videoId,
    };
  });

const safeParseVideo = (data: unknown) => {
  const result = iqiyiEpisodeTabDataVideoSchema.safeParse(data);
  if (!result.success) {
    // console.warn("爱奇艺: 解析分集数据不符合预期，跳过:", z.prettifyError(result.error), data);
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
                videos: z.object({
                  feature_paged: z.record(z.any(), z.array(z.unknown())),
                }),
              })
              .safeParse(v).data ?? null,
        ),
      )
      .transform((v) => {
        const output: z.infer<typeof iqiyiEpisodeTabDataVideoSchema>[] = [];
        for (const rows of v) {
          if (!rows) continue;
          for (const value of Object.values(rows.videos?.feature_paged ?? {})) {
            for (const item of value) {
              const data = safeParseVideo(item);
              if (data) {
                output.push(data);
              }
            }
          }
        }
        return output;
      }),
  }),
});

const iqiyiVarietyShowTabSchema = z.object({
  bk_id: z.literal("source_selector_bk"),
  bk_type: z.literal("video_list"),
  data: z.object({
    data: z
      .array(
        z.unknown().transform((v) => {
          const parsed = z
            .object({
              videos: z.array(
                z.unknown().transform((item) => {
                  return (
                    z
                      .object({
                        data: z.array(z.unknown()),
                      })
                      .safeParse(item).data ?? null
                  );
                }),
              ),
            })
            .safeParse(v);

          if (!parsed.success) return [];

          const list: z.infer<typeof iqiyiEpisodeTabDataVideoSchema>[] = [];
          for (const row of parsed.data.videos) {
            if (!row) continue;
            for (const item of row.data) {
              const d = safeParseVideo(item);
              if (d) list.push(d);
            }
          }
          return list;
        }),
      )
      .transform((rows) => rows.flat()),
  }),
});

const iqiyiMovieTabSchema = z.object({
  bk_id: z.literal("film_feature_bk"),
  bk_type: z.literal("video_list"),
  data: z.object({
    data: z
      .object({
        videos: z.array(z.unknown()),
      })
      .transform((v) => compact(v.videos.map(safeParseVideo))),
  }),
});

export const iqiyiEpisodeTabSchema = z
  .union([iqiyiTvTabSchema, iqiyiMovieTabSchema, iqiyiVarietyShowTabSchema])
  .transform((v) => v.data.data);

export const iqiyiV3ApiResponseSchema = z
  .object({
    status_code: z.number(),
    data: z
      .object({
        template: z.object({
          tabs: z.array(
            z.object({
              tab_id: z.string(),
              tab_title: z.string(),
              blocks: z.array(z.unknown()),
            }),
          ),
        }),
      })
      .optional(),
  })
  .transform((v) => {
    let result: z.infer<typeof iqiyiEpisodeTabSchema> = [];
    for (const tab of v.data?.template.tabs ?? []) {
      for (const block of tab.blocks) {
        const { success, data } = iqiyiEpisodeTabSchema.safeParse(block);
        if (success) {
          result = result.concat(data);
        }
      }
    }
    return result;
  });

export const iqiyiVideoBaseInfoResponseSchema = z.object({
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
      data: z.object({
        entry: z
          .array(z.unknown().transform((v) => iqiyiCommentsEntrySchema.safeParse(v).data?.list.bulletInfo))
          .transform((v) => compact(v.flat())),
      }),
    }),
  })
  .transform((v) => v.danmu.data.entry);
