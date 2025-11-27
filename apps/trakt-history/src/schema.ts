import { z } from "zod";

export const accessTokenSchema = z
  .object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
    refresh_token: z.string(),
    created_at: z.number(),
  })
  .transform((v) => {
    return {
      accessToken: v.access_token,
      expiresAt: (v.created_at + v.expires_in) * 1000,
      refreshToken: v.refresh_token,
    };
  });

export const deviceCodeSchema = z
  .object({
    device_code: z.string(),
    user_code: z.string(),
    verification_url: z.string(),
    expires_in: z.number(),
    interval: z.number(),
  })
  .transform((v) => {
    const expiresAt = Date.now() + v.expires_in * 1000;
    return {
      deviceCode: v.device_code,
      userCode: v.user_code,
      verificationUrl: v.verification_url,
      expiresAt,
      interval: v.interval,
    };
  });
