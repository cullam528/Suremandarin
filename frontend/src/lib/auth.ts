import { cookies } from "next/headers";

export const AUTH_COOKIE = "suremandarin_session";
export const STRAPI_URL =
  process.env.STRAPI_URL ??
  process.env.NEXT_PUBLIC_STRAPI_URL ??
  "https://api.suremandarin.com";

export async function setAuthCookie(jwt: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}
export async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE)?.value;
}

export async function getCurrentUser() {
  const token = await getAuthToken();
  if (!token) return null;
  const response = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) return null;
  return response.json();
}
