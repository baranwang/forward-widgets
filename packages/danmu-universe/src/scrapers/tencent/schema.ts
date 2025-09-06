import { compact } from "es-toolkit";
import { DEFAULT_COLOR_HEX, DEFAULT_COLOR_INT } from "../../libs/constants";
import { safeJsonParseWithZod } from "../../libs/utils";
import { z } from "../../libs/zod";
import { CommentMode, providerCommentItemSchema } from "../base";

export const tencentIdSchema = z.object({
  cid: z.string(),
  vid: z.string().optional(),
});

export type TencentId = z.infer<typeof tencentIdSchema>;

const tencentEpisodeSchema = z.object({
  vid: z.string().refine((val) => !!val),
  is_trailer: z.string().refine((val) => val !== "1"),
  title: z.string().refine((val) => {
    const junkKeywords = ["预告", "彩蛋", "直拍", "直播回顾", "加更", "走心", "解忧", "纯享", "节点", "采访", "花絮"];
    for (const keyword of junkKeywords) {
      if (val.includes(keyword)) {
        return false;
      }
    }
    return true;
  }),
  union_title: z.optional(z.string()).refine((val) => {
    if (val?.includes("预告")) {
      return false;
    }
    return true;
  }),
});

export const tencentEpisodeResultSchema = z
  .object({
    data: z.object({
      module_list_datas: z.array(
        z.object({
          module_datas: z.array(
            z.object({
              item_data_lists: z.object({
                item_datas: z
                  .array(
                    z
                      .object({
                        item_params: z.unknown().transform((v) => tencentEpisodeSchema.safeParse(v).data ?? null),
                      })
                      .transform((v) => v.item_params ?? null),
                  )
                  .transform((v) => compact(v)),
              }),
            }),
          ),
        }),
      ),
    }),
  })
  .transform((v) => v.data.module_list_datas?.[0]?.module_datas?.[0]?.item_data_lists?.item_datas ?? []);

export const tencentSegmentIndexSchema = z.object({
  segment_index: z.record(
    z.string(),
    z.object({
      segment_name: z.string(),
    }),
  ),
});

const tencentCommentItemSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    time_offset: z.coerce.number().transform((v) => v / 1000),
    content_style: z
      .string()
      .nullish()
      .transform((v) => {
        return safeJsonParseWithZod(
          v ?? "{}",
          z
            .object({
              color: z.string().optional().default(DEFAULT_COLOR_HEX),
              position: z.number().optional().default(1),
              gradient_colors: z.array(z.string()).optional(),
            })
            .transform((v) => {
              // -- 模式计算 --
              let mode = CommentMode.SCROLL;
              if (v.position === 2) {
                mode = CommentMode.TOP;
              } else if (v.position === 3) {
                mode = CommentMode.BOTTOM;
              }
              // -- 颜色计算 --
              // 优先使用 color 字段，如果没有则为默认白色
              let finalColor = v.color ? parseInt(v.color, 16) : DEFAULT_COLOR_INT;
              if (finalColor === DEFAULT_COLOR_INT && v.gradient_colors?.length) {
                // 如果颜色是白色，且有渐变色，则使用渐变色，计算一个平均色
                finalColor =
                  v.gradient_colors.reduce((acc, color) => acc + parseInt(color, 16), 0) / v.gradient_colors.length;
              }
              return {
                mode,
                color: finalColor,
              };
            }),
        );
      }),
  })
  .transform((v) => {
    return (
      providerCommentItemSchema.safeParse({
        id: v.id,
        timestamp: v.time_offset,
        mode: v.content_style?.mode,
        color: v.content_style?.color,
        content: v.content,
      }).data ?? null
    );
  });

export const tencentSegmentSchema = z.object({
  barrage_list: z
    .array(z.unknown().transform((v) => tencentCommentItemSchema.safeParse(v).data ?? null))
    .transform((v) => v.filter((v) => v !== null)),
});

export type TencentSegmentIndex = z.infer<typeof tencentSegmentIndexSchema>;
