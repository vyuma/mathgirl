import { getSession } from "next-auth/react";

/**
 * fetch wrapper that automatically attaches the Google ID token
 * as an Authorization: Bearer header.
 */
export async function authFetch(
  url: string | URL | Request,
  options: RequestInit = {},
): Promise<Response> {
  const session = await getSession();
  const idToken = session?.idToken;

  const headers = new Headers(options.headers);
  if (idToken) {
    headers.set("Authorization", `Bearer ${idToken}`);
  }

  return fetch(url, { ...options, headers });
}
