import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const rateConfigs = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  availability: { windowMs: 60 * 1000, max: 120 },
  default: { windowMs: 5 * 60 * 1000, max: 100 },
} as const satisfies Record<string, RateLimitConfig>;

export function createLimiter(config: RateLimitConfig): RequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  });
}
