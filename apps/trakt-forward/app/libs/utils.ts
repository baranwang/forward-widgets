import { brotliCompressSync, brotliDecompressSync } from "node:zlib";

const createObjectCodec = <T extends Record<string, unknown>>() => {
  return {
    encode: (data: T) => {
      return brotliCompressSync(JSON.stringify(data)).toString("base64url");
    },
    decode: (str: string) => {
      try {
        return JSON.parse(brotliDecompressSync(Buffer.from(str, "base64url")).toString()) as T;
      } catch {
        return null;
      }
    },
  };
};

export const stateTransformer = createObjectCodec<{ redirect_uri: string }>();
export const cookieTransformer = createObjectCodec<{ redirect_uri: string; refresh_token: string }>();
