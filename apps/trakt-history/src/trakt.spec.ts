import { describe, expect, test } from "@rstest/core";
import { Trakt } from "./trakt";

describe("trakt", async () => {
  test("generateDeviceCode", async () => {
    const trakt = new Trakt(process.env.TRAKT_CLIENT_ID as string, process.env.TRAKT_CLIENT_SECRET as string);
    const tokenData = await trakt.authorize();
    expect(tokenData).toBeDefined();
  });
});
