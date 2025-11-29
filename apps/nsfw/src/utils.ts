import { merge } from "es-toolkit";

const DEFAULT_HEADERS = {
  "Accept-Language": "zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7",
};

type RequestOptions = Parameters<typeof Widget.http.get>[1];

export class WidgetAPI {
  constructor(private getDefaultOptions?: () => Promise<RequestOptions>) {}

  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    // 初始化基础选项，包含默认headers
    let baseOptions: RequestOptions = {
      headers: DEFAULT_HEADERS,
    };

    // 尝试获取默认配置
    if (this.getDefaultOptions) {
      try {
        const defaultOptions = await this.getDefaultOptions();
        baseOptions = merge(baseOptions, defaultOptions ?? {});
      } catch (error) {
        console.warn("获取默认配置失败，使用基础配置:", error);
      }
    }

    // 合并用户传入的选项
    const finalOptions = merge(baseOptions, options ?? {});

    try {
      const resp = await Widget.http.get<T>(url, finalOptions);
      if (!resp || resp.statusCode !== 200) {
        throw new Error(`请求失败: ${resp?.statusCode || "未知错误"}`);
      }
      return resp.data;
    } catch (error) {
      throw new Error(`网络请求失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  async getHtml(url: string, options?: RequestOptions) {
    const resp = await this.get<string>(url, options);
    return Widget.html.load(resp);
  }
}

export async function getStorageItem(key: string) {
  return Widget.storage.get(key);
}

export async function setStorageItem(key: string, value: string) {
  return Widget.storage.set(key, value);
}
