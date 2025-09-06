import { compact } from "es-toolkit";
import { fetch } from "../fetch";
import { z } from "../zod";

const doubanSubjectItemSchema = z.object({
  type_name: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  target: z.object({
    title: z.string(),
    has_linewatch: z.boolean().refine((val) => val), // 不能播放的取出来也没意义
  }),
});

const doubanSearchResponseSchema = z.object({
  subjects: z.object({
    items: z
      .array(z.unknown().transform((v) => doubanSubjectItemSchema.safeParse(v).data ?? null))
      .transform((v) => compact(v)),
  }),
});

export const searchDoubanInfoByName = async (keywords?: string) => {
  if (!keywords) {
    return [];
  }
  const response = await fetch.get("https://m.douban.com/rexxar/api/v2/search", {
    params: {
      q: keywords,
      start: 0,
      count: 20,
      type: "movie",
    },
    headers: {
      Referer: `https://m.douban.com/movie/`,
      "Content-Type": "application/json",
    },
    schema: doubanSearchResponseSchema,
    cache: {
      cacheKey: ["douban", "search", keywords].filter(Boolean).join(":"),
    },
  });
  return response.data?.subjects.items ?? [];
};

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("searchDoubanInfoByName", async () => {
    const subjects = await searchDoubanInfoByName("庆余年");
    expect(subjects).toBeDefined();
    expect(subjects.length).toBeGreaterThan(0);
  });
}
