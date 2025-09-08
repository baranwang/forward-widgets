const GLOBAL_EPISODE_BLACKLIST =
  "^(.*?)((.+?版)|(特(别|典))|((导|演)员|嘉宾|角色)访谈|福利|先导|彩蛋|花絮|预告|特辑|专访|访谈|幕后|周边|资讯|看点|速看|回顾|盘点|合集|PV|MV|CM|OST|ED|OP|BD|特典|SP|NCOP|NCED|MENU|Web-DL|rip|x264|x265|aac|flac)(.*?)$";

export const getEpisodeBlacklistPattern = (providerSpecificBlacklist?: string) => {
  const finalPatterns: string[] = [GLOBAL_EPISODE_BLACKLIST];
  if (providerSpecificBlacklist?.trim()) {
    finalPatterns.push(providerSpecificBlacklist);
  }
  const finalRegexStr = finalPatterns.join("|");
  try {
    return new RegExp(finalRegexStr, "i");
  } catch (e) {
    console.error("编译分集黑名单正则表达式失败：", finalRegexStr, "错误：", e);
    return new RegExp(GLOBAL_EPISODE_BLACKLIST, "i");
  }
};
