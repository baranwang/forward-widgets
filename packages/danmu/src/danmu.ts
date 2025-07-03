class Danmu {
  async getTencentDanmu(vid: string) {
    const response = await Widget.http.get<{
      segment_index: Record<
        string,
        {
          segment_start: `${number}`;
          segment_name: string;
        }
      >;
    }>(`https://dm.video.qq.com/barrage/base/${vid}`);

    const results = [];
    for (const segment of Object.values(response.data.segment_index)) {
      const segmentResponse = await Widget.http.get<{
        barrage_list: {
          content: string;
        }[];
      }>(`https://dm.video.qq.com/barrage/segment/${vid}/${segment.segment_name}`);
      results.push(...segmentResponse.data.barrage_list);
    }
    return results;
  }
}

export const danmu = new Danmu();
