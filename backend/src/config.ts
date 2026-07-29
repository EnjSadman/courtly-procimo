const defaultPort = 4000;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export const jwtSecret = process.env.JWT_SECRET || "secret";
export const jwtExpiration = process.env.JWT_EXPIRATION || "7d";

export const port = Number(process.env.PORT) || defaultPort;

export const frontendUrl = normalizeBaseUrl(
  process.env.FRONTEND_URL || "http://localhost:3000",
);
