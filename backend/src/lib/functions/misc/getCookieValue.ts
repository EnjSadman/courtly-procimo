import { parse as parseCookieHeader } from "cookie";

export function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  return parseCookieHeader(cookieHeader)[name];
}
