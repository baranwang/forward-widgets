import { describe, expect, test } from "@rstest/core";
import { TencentScraper } from "./tencent";

describe("scraper.tencent", async () => {
  test.each([
    { cid: "mzc002009y0nzq8", episodeNumber: 24, seriesName: "子夜归" },
    { cid: "53q0eh78q97e4d1", episodeNumber: 520, seriesName: "名侦探柯南" },
    { cid: "mzc00200aaogpgh", episodeNumber: 121, seriesName: "仙逆" },
    { cid: "mzc0020027yzd9e", episodeNumber: 180, seriesName: "斗破苍穹" },
  ])("$seriesName", async ({ cid, episodeNumber }) => {
    const scraper = new TencentScraper();

    const episodes = await scraper.getEpisodes(scraper.generateIdString({ cid }), episodeNumber);
    expect(episodes).toBeDefined();
    expect(episodes.length).toBeGreaterThan(0);
    console.log("episodes", episodes);

    const segments = await scraper.getSegments(episodes[0].episodeId);
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments(episodes[0].episodeId, segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);
  });
});
