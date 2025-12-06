import { Fetch } from "@forward-widget/libs-fetch";

export class Bilibili {
  private fetch = new Fetch();

  constructor(cookies: Record<string, string>) {
    this.fetch.setCookie(cookies);
  }

  getSeasonIndex() {}
}
