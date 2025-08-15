import { merge } from "es-toolkit";
import { z } from "zod";

// 类型定义保持不变，它们已经很清晰了
type BaseRequestOptions = NonNullable<Parameters<typeof Widget.http.get>[1]>;
interface RequestOptions<T extends z.ZodType | undefined = undefined> extends BaseRequestOptions {
  timeout?: number;
  schema?: T;
}

type HttpResponse<T> = Awaited<ReturnType<typeof Widget.http.get<T>>>;

export class Fetch {
  constructor(
    private cookie: Record<string, string> = {},
    private headers: Record<string, string> = {},
  ) {}

  /**
   * 设置或更新 Cookie，通过合并而非完全替换来避免数据丢失。
   * @param cookie 要合并的 cookie 对象
   */
  setCookie(cookie: Record<string, string>) {
    this.cookie = merge(this.cookie, cookie);
  }

  getCookie(key: string) {
    return this.cookie[key];
  }

  /**
   * 设置或更新请求头，通过合并而非完全替换来避免数据丢失。
   * @param headers 要合并的请求头对象
   */
  setHeaders(headers: Record<string, string>) {
    this.headers = merge(this.headers, headers);
  }

  /**
   * 发起 GET 请求
   * @param url 请求地址
   * @param options 请求选项
   */
  async get<T extends z.ZodType>(
    url: string,
    options?: RequestOptions<T>,
  ): Promise<HttpResponse<T["_zod"]["output"] | null>>;
  async get<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
    const response = await this.executeRequest<T>("get", url, options);
    return this.handleResponse<T>(response, options?.schema);
  }

  /**
   * 发起 POST 请求
   * @param url 请求地址
   * @param body 请求体
   * @param options 请求选项
   */
  async post<T extends z.ZodType>(
    url: string,
    body: unknown,
    options?: RequestOptions<T>,
  ): Promise<HttpResponse<T["_zod"]["output"] | null>>;
  async post<T>(url: string, body: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
    const response = await this.executeRequest<T>("post", url, body, options);
    return this.handleResponse<T>(response, options?.schema);
  }

  /**
   * 构建请求头，包含默认头部、Cookie 和自定义头部
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const cookieString = Object.entries(this.cookie)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");

    // 使用展开语法合并，逻辑更清晰
    return {
      ...this.headers,
      ...(cookieString && { Cookie: cookieString }),
      ...customHeaders,
    };
  }

  /**
   * 创建一个在指定时间后 reject 的 Promise，用于实现超时控制
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * 统一执行请求的核心逻辑
   */
  private executeRequest<T>(
    method: "get" | "post",
    url: string,
    bodyOrOptions?: unknown | RequestOptions,
    options?: RequestOptions,
  ): Promise<HttpResponse<T>> {
    const isGet = method === "get";
    const requestOptions: RequestOptions = ((isGet ? bodyOrOptions : options) as RequestOptions) ?? {};
    const body = isGet ? undefined : bodyOrOptions;

    const { timeout, schema: _, ...restOptions } = requestOptions;
    const headers = this.buildHeaders(restOptions.headers);

    const requestConfig = {
      ...restOptions,
      headers,
    };

    const requestPromise = isGet
      ? Widget.http.get<T>(url, requestConfig)
      : Widget.http.post<T>(url, body, requestConfig);

    if (timeout && timeout > 0) {
      return Promise.race([requestPromise, this.createTimeoutPromise(timeout)]);
    }

    return requestPromise;
  }

  /**
   * 请求结束后的处理逻辑，如解析 Set-Cookie
   * 使用箭头函数或 bind 来确保 `this` 上下文正确
   */
  private handleResponse = <T>(response: HttpResponse<T>, schema?: z.ZodType): HttpResponse<T> => {
    const setCookieHeader = response.headers["set-cookie"] || response.headers["Set-Cookie"];
    console.log("headers", response.headers);

    if (setCookieHeader) {
      // Set-Cookie 可能是一个数组或单个字符串，统一处理
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

      const newCookies = cookies.reduce(
        (acc, cookieString) => {
          if (!cookieString) return acc;
          // 只取第一个 "key=value" 部分，忽略 expires, path 等属性
          const parts = cookieString.split(";");
          const [cookiePair] = parts;
          const [key, ...valueParts] = cookiePair.split("=");
          if (key && valueParts.length > 0) {
            acc[key.trim()] = valueParts.join("=").trim();
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      // 使用 setCookie 方法更新，保持逻辑统一
      this.setCookie(newCookies);
    }
    if (schema) {
      const result = schema.safeParse(response.data);
      if (!result.success) {
        console.error(`Failed to parse response with schema:`, z.prettifyError(result.error));
      }
      return {
        ...response,
        data: result.data as T,
      };
    }
    return response;
  };
}
