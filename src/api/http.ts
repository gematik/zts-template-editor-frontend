/*
 * Copyright (Change Date see Readme), gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ******
 *
 * For additional notes and disclaimer from gematik and in case of changes
 * by gematik, find details in the "Readme" file.
 */

import { isUnauthorized } from "../auth/oauth2Proxy";
import { oauth2ProxyStartUrl } from "../auth/oauth2Proxy";
import router from "../router";
import { logger } from "../utils/logger";

export class ApiError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`HTTP ${status} ${statusText}${body ? ` – ${body}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

type ApiOptions = RequestInit & { responseType?: "auto" | "json" | "text" };

const httpLogger = logger.scope("api/http");

function handleUnauthorized(): never {
  const currentPath = router.currentRoute.value.fullPath || globalThis.location.pathname || "/";
  const returnTo = new URL(currentPath, globalThis.location.origin).toString();

  isUnauthorized.value = true;
  globalThis.location.href = oauth2ProxyStartUrl(returnTo);

  throw new ApiError(401, "Unauthorized", "Session expired");
}

export function resolveApiBase(): string {
  if (!("location" in globalThis)) return "";

  // oauth2-proxy owns the browser-facing origin.
  // The frontend must never call the backend directly, otherwise cookies are not sent
  // to the proxy and CORS preflights hit the upstream backend.
  httpLogger.debug("API base resolved from current origin.", { origin: globalThis.location.origin });
  return globalThis.location.origin;
}


export async function api<T>(path: string, init: ApiOptions = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Requested-With", "XMLHttpRequest");

  const url = `${resolveApiBase()}${path}`;

  try {
    httpLogger.debug("HTTP request started.", {
      url,
      method: init.method ?? "GET",
      responseType: init.responseType ?? "auto",
      hasBody: !!init.body,
    });

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: init.credentials ?? "include",
    });

    httpLogger.debug("HTTP response received.", {
      url,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type") || "",
    });

    if (res.status === 401) {
      httpLogger.warn("HTTP 401 received. Redirecting to oauth2-proxy login.", { url });
      handleUnauthorized();
    }

    const ct = (res.headers.get("content-type") || "").toLowerCase();

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      httpLogger.error("HTTP request failed.", { url, status: res.status, statusText: res.statusText, body: text });
      throw new ApiError(res.status, res.statusText, text);
    }

    const responseType = init.responseType ?? "auto";

    if (responseType === "text") {
      return (await res.text()) as unknown as T;
    }

    if (responseType === "json") {
      return (await res.json()) as T;
    }

    if (ct.includes("application/json")) {
      const raw = await res.text().catch(() => "");
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }

    return (await res.text()) as unknown as T;
  } catch (error) {
    if (error instanceof TypeError) {
      httpLogger.warn("Network error while calling backend through oauth2-proxy.", { url, error });
      throw new ApiError(0, "Network Error", "Backend is not reachable");
    }

    throw error;
  }
}
