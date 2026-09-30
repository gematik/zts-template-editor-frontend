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

import { ref } from "vue";
import { logger } from "../utils/logger";

export const isAuthenticated = ref(false);
export const isUnauthorized = ref(false);

const oauth2ProxyLogger = logger.scope("auth/oauth2Proxy");

function sameOriginReturnTo(returnTo: string, fallbackPath = "/"): string {
  const fallbackUrl = new URL(fallbackPath, globalThis.location.origin);

  try {
    const url = new URL(returnTo, globalThis.location.origin);
    return url.origin === globalThis.location.origin ? url.toString() : fallbackUrl.toString();
  } catch {
    return fallbackUrl.toString();
  }
}

export function oauth2ProxyStartUrl(returnTo: string = currentUrl()): string {
  const url = new URL("/oauth2/start", globalThis.location.origin);
  url.searchParams.set("rd", sameOriginReturnTo(returnTo));
  return url.toString();
}

export function oauth2ProxySignOutUrl(returnTo: string = new URL("/", globalThis.location.origin).toString()): string {
  const url = new URL("/oauth2/sign_out", globalThis.location.origin);
  url.searchParams.set("rd", sameOriginReturnTo(returnTo));
  return url.toString();
}

export function oauth2ProxyAuthUrl(): string {
  return new URL("/oauth2/auth", globalThis.location.origin).toString();
}

export async function checkOAuth2ProxySession(): Promise<boolean> {
  const url = oauth2ProxyAuthUrl();

  oauth2ProxyLogger.debug("Checking oauth2-proxy session via /oauth2/auth.", { url });

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    redirect: "manual",
    headers: {
      Accept: "text/plain",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (response.status === 202 || response.status === 200) {
    oauth2ProxyLogger.debug("oauth2-proxy session is active.", { status: response.status });
    return true;
  }

  if (response.status === 401 || response.status === 403) {
    oauth2ProxyLogger.debug("oauth2-proxy session is not active.", { status: response.status });
    return false;
  }

  oauth2ProxyLogger.warn("Unexpected oauth2-proxy auth response.", {
    status: response.status,
    statusText: response.statusText,
    type: response.type,
  });

  return false;
}

export function currentUrl(): string {
  return globalThis.location.href;
}

export function markAuthenticated(): void {
  isAuthenticated.value = true;
  isUnauthorized.value = false;
}

export function clearAuthState(): void {
  isAuthenticated.value = false;
  isUnauthorized.value = false;
}
