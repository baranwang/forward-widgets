export const parseEpNumber = (title: string): number | null => {
  if (!title) return null;

  const s = normalizeTitle(title);

  // 1) 第<阿拉伯数字><后缀> 结尾，如：第1集、第10话、第001回
  {
    const m = /第\s*([0-9]+)\s*(?:[集话話回期])\s*$/.exec(s);
    if (m) return toInt(m[1]);
  }

  // 2) 第<中文数字><后缀> 结尾，如：第十二集、第两百三十话
  {
    const m = /第\s*([零〇一二两三四五六七八九十百千万萬]+)\s*(?:[集话話回期])\s*$/.exec(s);
    if (m) {
      const n = parseChineseNumeral(m[1]);
      return Number.isFinite(n) ? n : null;
    }
  }

  // 3) SxxEyy 结尾，如：S01E02、s1e12
  {
    const m = /S\d{1,3}\s*E(\d{1,4})\s*$/i.exec(s);
    if (m) return toInt(m[1]);
  }

  // 4) EPxx/Exx 结尾，如：EP12、E07、ep 003
  {
    const m = /EP?\s*0*(\d{1,4})\s*$/i.exec(s);
    if (m) return toInt(m[1]);
  }

  // 5) 通用尾部数字，如：标题_98、标题 (01)、标题 - 01、标题【03】
  {
    const m = /(?:^|[\s_\-（(【[])\s*0*(\d{1,5})\s*(?:[】\])）])?\s*(?:END|FIN|完|完结)?\s*$/i.exec(s);
    if (m) return toInt(m[1]);
  }

  return null;
};

/**
 * 将标题中常见全角字符归一化：全角数字、全角空格
 */
function normalizeTitle(input: string): string {
  let s = input.trim();
  // 全角数字 -> 半角数字
  s = s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
  // 全角空格 -> 半角空格
  s = s.replace(/\u3000/g, " ");
  return s;
}

/**
 * 安全转换为整数
 */
function toInt(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * 解析常见中文数字（支持到万级）
 */
function parseChineseNumeral(s: string): number {
  const numMap: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  const unitMap: Record<string, number> = {
    十: 10,
    百: 100,
    千: 1000,
    万: 10000,
    萬: 10000,
  };

  let result = 0; // 总和
  let section = 0; // 小节（万以内）
  let number = 0; // 当前数字

  for (const ch of s) {
    if (ch in numMap) {
      number = numMap[ch];
    } else if (ch in unitMap) {
      const unit = unitMap[ch];
      if (unit === 10000) {
        section = (section + (number || 0)) * unit;
        result += section;
        section = 0;
      } else {
        section += (number || 1) * unit;
      }
      number = 0;
    }
  }
  return result + section + number;
}

if (import.meta.rstest) {
  const { test, expect } = import.meta.rstest;

  test("parseEpNumber - 原有用例", () => {
    expect(parseEpNumber("第1集")).toBe(1);
    expect(parseEpNumber("第1话")).toBe(1);
    expect(parseEpNumber("小五郎约会杀人事件_98")).toBe(98);
  });

  test("parseEpNumber - 全角与中文数字", () => {
    expect(parseEpNumber("第１０集")).toBe(10);
    expect(parseEpNumber("第十二话")).toBe(12);
    expect(parseEpNumber("第两百三十集")).toBe(230);
  });

  test("parseEpNumber - 常见番剧命名", () => {
    expect(parseEpNumber("S01E02")).toBe(2);
    expect(parseEpNumber("EP03")).toBe(3);
    expect(parseEpNumber("E7")).toBe(7);
  });

  test("parseEpNumber - 通用尾部数字", () => {
    expect(parseEpNumber("某动画 - 01")).toBe(1);
    expect(parseEpNumber("某动画 (02)")).toBe(2);
    expect(parseEpNumber("某动画【03】")).toBe(3);
  });
}
