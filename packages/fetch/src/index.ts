import { storage } from "@forward-widget/libs-storage";
import { merge, omit } from "es-toolkit";
import { stringify as qsStringify } from "querystringify";
import { z } from "zod";

type BaseRequestOptions = NonNullable<Parameters<typeof Widget.http.get>[1]>;
export interface RequestOptions<T extends z.ZodType | undefined = undefined>
  extends Omit<BaseRequestOptions, "params"> {
  params?: Record<string, any>;
  timeout?: number;
  cache?:
    | string
    | {
        cacheKey?: string;
        ttl?: number;
      };
  successStatus?: number[];
  schema?: T;
}

// 请求上下文信息
interface RequestContext {
  url: string;
  method: "GET" | "POST";
  body?: unknown;
  options?: RequestOptions;
}

// 自定义错误类
class HttpStatusError extends Error {
  constructor(
    public statusCode: number,
    public expectedStatus: number[],
    public context: RequestContext,
    public response: HttpResponse<unknown>,
  ) {
    super(`HTTP ${statusCode} - Expected: [${expectedStatus.join(", ")}] - ${context.method} ${context.url}`);
    this.name = "HttpStatusError";

    console.error(`🚫 HTTP Request Failed: ${context.method} ${context.url}`, "Status", statusCode);
    if (context.body) console.error("Request Body:", JSON.stringify(context.body));
    if (context.options) console.error("Request Options:", omit(context.options, ["schema", "successStatus"]));
    console.error("Response:", { headers: response.headers, data: response.data });
  }
}

class HttpSchemaError extends Error {
  constructor(
    public context: RequestContext,
    public response: HttpResponse<unknown>,
    public error: z.ZodError,
  ) {
    super(`Failed to parse response with schema: ${z.prettifyError(error)}`);
    this.name = "HttpSchemaError";

    console.error(
      `🚫 HTTP Request Failed Failed to parse response with schema: ${z.prettifyError(error)}: ${context.method} ${context.url}`,
    );
    if (context.options) console.error("Request Options:", omit(context.options, ["schema", "successStatus"]));
    console.error("Response:", { headers: response.headers, data: response.data });
  }
}

export type HttpResponse<T> = Awaited<ReturnType<typeof Widget.http.get<T>>>;

export class Fetch {
  constructor(
    public cookie: Record<string, string> = {},
    public headers: Record<string, string> = {},
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
  async get<T>(url: string, options?: RequestOptions<never>): Promise<HttpResponse<T>>;
  async get<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
    options ??= {};
    options.headers ??= {};
    options.headers = this.buildHeaders(options.headers);
    const response = await this.executeRequest<T>("GET", url, options);
    const context: RequestContext = { url, method: "GET", options };
    return this.handleResponse<T>(response, context, options);
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
  async post<T>(url: string, body: unknown, options?: RequestOptions<never>): Promise<HttpResponse<T>>;
  async post<T>(url: string, body: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
    options ??= {};
    options.headers ??= {};
    options.headers = this.buildHeaders(options.headers);
    const response = await this.executeRequest<T>("POST", url, body, options);
    const context: RequestContext = { url, method: "POST", body, options };
    return this.handleResponse<T>(response, context, options);
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
  private async executeRequest<T>(
    method: "GET" | "POST",
    url: string,
    bodyOrOptions?: unknown | RequestOptions,
    options?: RequestOptions,
  ): Promise<HttpResponse<T> & { fromCache?: boolean }> {
    const isGet = method === "GET";
    const requestOptions: RequestOptions = ((isGet ? bodyOrOptions : options) as RequestOptions) ?? {};
    const cacheConfig = this.getCacheConfig(requestOptions);
    if (cacheConfig?.cacheKey) {
      const cached = await storage.getJson<T>(cacheConfig.cacheKey);
      if (cached) {
        console.debug("♻️ fetch cache hit", cacheConfig.cacheKey);
        return {
          data: cached,
          statusCode: 200,
          headers: {},
          fromCache: true,
        };
      }
    }

    const body = isGet ? undefined : bodyOrOptions;

    const { timeout, schema: _, params, ...restOptions } = requestOptions;

    let finalUrl = url;
    if (params) {
      finalUrl = `${url}?${qsStringify(params)}`;
    }

    console.debug("⬆️ fetch", finalUrl, body ?? "", restOptions);
    const requestPromise = isGet
      ? Widget.http.get<T>(finalUrl, restOptions)
      : Widget.http.post<T>(finalUrl, body, restOptions);

    if (timeout && timeout > 0) {
      return Promise.race([requestPromise, this.createTimeoutPromise(timeout)]);
    }

    return requestPromise;
  }

  private handleResponse = <T>(
    response: HttpResponse<T> & { fromCache?: boolean },
    context: RequestContext,
    options?: RequestOptions,
  ): Promise<HttpResponse<T>> | HttpResponse<T> => {
    if (response.fromCache) {
      return response;
    }

    if (options?.successStatus?.length && !options.successStatus.includes(response.statusCode)) {
      throw new HttpStatusError(response.statusCode, options.successStatus, context, response);
    }

    if (options?.schema) {
      const result = (options.schema as z.ZodType).safeParse(response.data);
      if (!result.success) {
        throw new HttpSchemaError(context, response, result.error);
      }
      response.data = result.data as T;
    }

    const setCookieHeader = response.headers["set-cookie"] || response.headers["Set-Cookie"];

    if (setCookieHeader) {
      const newCookies = setCookieHeader.split(",").reduce(
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

      this.setCookie(newCookies);
    }

    const cacheConfig = this.getCacheConfig(options);
    if (cacheConfig?.cacheKey) {
      storage.setJson(cacheConfig.cacheKey, response.data, { ttl: cacheConfig.ttl });
    }
    return response;
  };

  private getCacheConfig(options?: RequestOptions) {
    if (typeof options?.cache === "string") {
      return {
        cacheKey: options.cache,
        ttl: undefined,
      };
    }
    return options?.cache;
  }
}

export const fetch = new Fetch();
