import { compact } from "es-toolkit";
import { DEFAULT_COLOR_HEX, DEFAULT_COLOR_INT } from "../../libs/constants";
import { safeJsonParseWithZod } from "../../libs/utils";
import { z } from "../../libs/zod";
import { CommentMode, providerCommentItemSchema } from "../base";
import { getEpisodeBlacklistPattern } from "../blacklist";

export const tencentIdSchema = z.object({
  cid: z.string(),
  vid: z.string().optional(),
});

export type TencentId = z.infer<typeof tencentIdSchema>;

const episodeBlacklistPattern = getEpisodeBlacklistPattern(
  [
    "拍摄花絮",
    "制作花絮",
    "幕后花絮",
    "未播花絮",
    "独家花絮",
    "花絮特辑",
    "预告片",
    "先导预告",
    "终极预告",
    "正式预告",
    "官方预告",
    "彩蛋片段",
    "删减片段",
    "未播片段",
    "番外彩蛋",
    "精彩片段",
    "精彩看点",
    "精彩回顾",
    "精彩集锦",
    "看点解析",
    "看点预告",
    "NG镜头",
    "NG花絮",
    "番外篇",
    "番外特辑",
    "制作特辑",
    "拍摄特辑",
    "幕后特辑",
    "导演特辑",
    "演员特辑",
    "片尾曲",
    "插曲",
    "主题曲",
    "背景音乐",
    "OST",
    "音乐MV",
    "歌曲MV",
    "前季回顾",
    "剧情回顾",
    "往期回顾",
    "内容总结",
    "剧情盘点",
    "精选合集",
    "剪辑合集",
    "混剪视频",
    "独家专访",
    "演员访谈",
    "导演访谈",
    "主创访谈",
    "媒体采访",
    "发布会采访",
    "抢先看",
    "抢先版",
    "试看版",
    "短剧",
    "vlog",
    "纯享",
    "加更",
    "reaction",
    "精编",
    "会员版",
    "Plus",
    "独家版",
    "特别版",
    "短片",
    "合唱",
  ].join("|"),
);

const tencentEpisodeSchema = z.object({
  vid: z.string().refine((val) => !!val),
  is_trailer: z.string().refine((val) => val !== "1"),
  title: z.string().refine((val) => !episodeBlacklistPattern.test(val)),
  union_title: z
    .string()
    .refine((val) => !episodeBlacklistPattern.test(val))
    .optional(),
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
