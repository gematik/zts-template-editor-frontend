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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserinfo, clearUserInfo } from "../../composables/useUserinfo";
import { getUserInfo } from "../../api/userinfo";
import type { UserInfo } from "../../types";

vi.mock("../../api/userinfo", () => ({
  getUserInfo: vi.fn(),
  sanitizeExternalUrl: (value: unknown) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  },
}));

const mockedGetUserInfo = vi.mocked(getUserInfo);

function createUser(overrides?: Partial<UserInfo>): UserInfo {
  return {
    name: "Default User",
    groups: [],
    is_reviewer: false,
    picture: "",
    ...overrides,
  };
}

describe("useUserinfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUserInfo();
  });

  it("fetchUserInfo lädt Benutzerinformationen", async () => {
    mockedGetUserInfo.mockResolvedValue(createUser({ name: "Jane" }));

    const { fetchUserInfo, userInfo, isLoading } = useUserinfo();
    await fetchUserInfo();

    expect(isLoading.value).toBe(false);
    expect(userInfo.value?.name).toBe("Jane");
  });

  it("lädt nicht erneut ohne force", async () => {
    mockedGetUserInfo.mockResolvedValue(createUser({ name: "Loaded" }));

    const { fetchUserInfo } = useUserinfo();
    await fetchUserInfo();
    await fetchUserInfo();

    expect(mockedGetUserInfo).toHaveBeenCalledTimes(1);
  });

  it("lädt erneut mit force=true", async () => {
    mockedGetUserInfo.mockResolvedValue(createUser({ name: "Reloaded" }));

    const { fetchUserInfo } = useUserinfo();
    await fetchUserInfo();
    await fetchUserInfo(true);

    expect(mockedGetUserInfo).toHaveBeenCalledTimes(2);
  });

  it("dedupliziert gleichzeitige Aufrufe", async () => {
    let resolveFn!: (v: UserInfo) => void;
    mockedGetUserInfo.mockReturnValue(new Promise(res => { resolveFn = res; }));

    const { fetchUserInfo } = useUserinfo();
    const p1 = fetchUserInfo();
    const p2 = fetchUserInfo();

    expect(mockedGetUserInfo).toHaveBeenCalledTimes(1);
    resolveFn(createUser({ name: "Async" }));

    await p1;
    await p2;
  });

  it("behandelt Fehler korrekt", async () => {
    const error = new Error("API failed");
    mockedGetUserInfo.mockRejectedValue(error);
    const { fetchUserInfo, error: errRef, userInfo } = useUserinfo();
    await expect(fetchUserInfo()).rejects.toThrow("API failed");

    expect(userInfo.value).toBeNull();
    expect(errRef.value).toBe(error);
  });

  it("clearUserInfo löscht Benutzerinformationen", async () => {
    mockedGetUserInfo.mockResolvedValue(createUser({ name: "Clear Me" }));

    const { fetchUserInfo, clearUserInfo, userInfo } = useUserinfo();
    await fetchUserInfo();
    clearUserInfo();

    expect(userInfo.value).toBeNull();
  });

  it("computed Properties liefern Werte", async () => {
    mockedGetUserInfo.mockResolvedValue(createUser({ name: "Computed User", picture: "https://gitlab.example/avatar.png", is_reviewer: true }));

    const { fetchUserInfo, displayName, profilePicture, isReviewer, initials } = useUserinfo();
    await fetchUserInfo();

    expect(displayName.value).toBe("Computed User");
    expect(profilePicture.value).toBe("");
    expect(isReviewer.value).toBe(true);
    expect(initials.value).toBe("CU");
  });


  it("unterdrückt relative Profilbilder", async () => {
    mockedGetUserInfo.mockResolvedValue(createUser({ name: "Fabian Müller", picture: "N/A" }));

    const { fetchUserInfo, profilePicture, initials } = useUserinfo();
    await fetchUserInfo();

    expect(profilePicture.value).toBe("");
    expect(initials.value).toBe("FM");
  });
});
