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

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useAuth } from "../../composables/useAuth";
import { isAuthenticated, isUnauthorized } from "../../auth/oauth2Proxy";

const {
  mockRouterPush,
  mockCheckOAuth2ProxySession,
  mockClearUserInfo,
  mockFetchUserInfo,
} = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockCheckOAuth2ProxySession: vi.fn(),
  mockClearUserInfo: vi.fn(),
  mockFetchUserInfo: vi.fn(),
}));

let hrefValue = "https://app.example.test/current";

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("../../composables/useUserinfo", () => ({
  useUserinfo: () => ({
    fetchUserInfo: mockFetchUserInfo,
    clearUserInfo: mockClearUserInfo,
  }),
}));

vi.mock("../../auth/oauth2Proxy", async () => {
  const actual = await vi.importActual<typeof import("../../auth/oauth2Proxy")>("../../auth/oauth2Proxy");
  return {
    ...actual,
    checkOAuth2ProxySession: mockCheckOAuth2ProxySession,
  };
});

function mockLocation(origin = "https://app.example.test", href = "https://app.example.test/current") {
  hrefValue = href;
  Object.defineProperty(globalThis, "location", {
    value: {
      origin,
      get href() { return hrefValue; },
      set href(v: string) { hrefValue = String(v); },
    } as any,
    configurable: true,
  });
}

describe("useAuth oauth2-proxy", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckOAuth2ProxySession.mockResolvedValue(true);
    mockFetchUserInfo.mockResolvedValue(undefined);
    originalLocation = globalThis.location;
    mockLocation();
    isAuthenticated.value = false;
    isUnauthorized.value = false;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "location", { value: originalLocation, configurable: true });
    vi.restoreAllMocks();
  });

  it("login leitet zu /oauth2/start mit rd weiter", () => {
    const { login, isLoggingIn } = useAuth();

    login("https://app.example.test/projects");

    expect(isLoggingIn.value).toBe(true);
    const url = new URL(globalThis.location.href);
    expect(url.pathname).toBe("/oauth2/start");
    expect(url.searchParams.get("rd")).toBe("https://app.example.test/projects");
  });

  it("logout löscht lokalen Zustand und leitet zu /oauth2/sign_out weiter", () => {
    isAuthenticated.value = true;
    const { logout, isLoggingOut, isLoggedIn } = useAuth();

    logout();

    expect(isLoggingOut.value).toBe(true);
    expect(mockClearUserInfo).toHaveBeenCalled();
    expect(isLoggedIn.value).toBe(false);
    expect(isAuthenticated.value).toBe(false);

    const url = new URL(globalThis.location.href);
    expect(url.pathname).toBe("/oauth2/sign_out");
    expect(url.searchParams.get("rd")).toBe("https://app.example.test/");
  });

  it("checkAuthStatus fragt /oauth2/auth ab und setzt angemeldet", async () => {
    mockCheckOAuth2ProxySession.mockResolvedValue(true);
    const { checkAuthStatus, isLoggedIn } = useAuth();

    const result = await checkAuthStatus();

    expect(mockCheckOAuth2ProxySession).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    expect(isLoggedIn.value).toBe(true);
    expect(isAuthenticated.value).toBe(true);
    expect(mockFetchUserInfo).toHaveBeenCalledWith(true);
  });

  it("checkAuthStatus setzt abgemeldet wenn Userinfo nach erfolgreicher Session nicht geladen werden kann", async () => {
    mockCheckOAuth2ProxySession.mockResolvedValue(true);
    mockFetchUserInfo.mockRejectedValue(new Error("userinfo failed"));
    const { checkAuthStatus, isLoggedIn } = useAuth();

    const result = await checkAuthStatus();

    expect(result).toBe(false);
    expect(isLoggedIn.value).toBe(false);
    expect(isAuthenticated.value).toBe(false);
    expect(mockClearUserInfo).toHaveBeenCalled();
  });

  it("checkAuthStatus setzt abgemeldet wenn /oauth2/auth nicht authentifiziert meldet", async () => {
    isAuthenticated.value = true;
    mockCheckOAuth2ProxySession.mockResolvedValue(false);
    const { checkAuthStatus, isLoggedIn } = useAuth();

    const result = await checkAuthStatus();

    expect(result).toBe(false);
    expect(isLoggedIn.value).toBe(false);
    expect(isAuthenticated.value).toBe(false);
    expect(mockClearUserInfo).toHaveBeenCalled();
  });

  it("checkAuthStatus setzt abgemeldet wenn der Auth-Check fehlschlägt", async () => {
    isAuthenticated.value = true;
    mockCheckOAuth2ProxySession.mockRejectedValue(new Error("network"));
    const { checkAuthStatus, isLoggedIn } = useAuth();

    const result = await checkAuthStatus();

    expect(result).toBe(false);
    expect(isLoggedIn.value).toBe(false);
    expect(isAuthenticated.value).toBe(false);
  });
});
