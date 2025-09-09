import { describe, expect, test } from "@rstest/core";
import { MgTVScraper } from "./mgtv";

describe("scraper.mgtv", async () => {
  test("国色芳华", async () => {
    const scraper = new MgTVScraper();

    const dramas = await scraper.search({
      seriesName: "国色芳华",
      airDate: "2025-06-01",
      season: "1",
      episode: "20",
    } as SearchDanmuParams);
    expect(dramas).toBeDefined();
    expect(dramas.length).toBeGreaterThan(0);
    console.log(dramas);

    const idString = scraper.generateIdString({ dramaId: dramas[0].dramaId });

    const episodes = await scraper.getEpisodes(idString, 20);
    expect(episodes).toBeDefined();
    expect(episodes.length).toBeGreaterThan(0);
    console.log(episodes);

    const segments = await scraper.getSegments(episodes[0].episodeId);
    expect(segments).toBeDefined();
    expect(segments.length).toBeGreaterThan(0);

    const comments = await scraper.getComments(episodes[0].episodeId, segments[0].segmentId);
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThan(0);
  });
});
