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

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { isUnauthorized } from "../../auth/oauth2Proxy";

const homeIsLoggedIn = ref(false);
const loginMock = vi.fn(() => {
  globalThis.location.href = new URL("/oauth2/start?rd=https%3A%2F%2Fapp.example.test%2F", globalThis.location.origin).toString();
});

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

vi.mock("../../composables/useUserinfo", () => ({
  useUserinfo: () => ({ fetchUserInfo: vi.fn(), clearUserInfo: vi.fn(), userInfo: ref(null) }),
}));

vi.mock("../../composables/useAuth", () => ({
  useAuth: () => ({ isLoggedIn: homeIsLoggedIn, login: loginMock }),
}));

import Home from "../../pages/Home.vue";

describe("Home.vue oauth2-proxy", () => {
  let originalLocation: Location;
  let hrefValue = "https://app.example.test/";

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = globalThis.location;
    hrefValue = "https://app.example.test/";
    Object.defineProperty(globalThis, "location", {
      value: {
        origin: "https://app.example.test",
        get href() { return hrefValue; },
        set href(v: string) { hrefValue = String(v); },
      } as any,
      configurable: true,
    });
    isUnauthorized.value = false;
    homeIsLoggedIn.value = false;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "location", { value: originalLocation, configurable: true });
    vi.restoreAllMocks();
  });

  it("rendert Login-Ansicht", () => {
    const wrapper = mount(Home);
    expect(wrapper.find("h2").text()).toBe("Login");
    expect(wrapper.find(".confirm-button").text()).toBe("Anmelden");
  });

  it("Login-Button ruft oauth2-proxy Login auf", async () => {
    const wrapper = mount(Home);
    await wrapper.find(".confirm-button").trigger("click");

    expect(loginMock).toHaveBeenCalled();
    expect(globalThis.location.href).toContain("/oauth2/start");
  });

  it("zeigt Willkommensnachricht wenn angemeldet", () => {
    homeIsLoggedIn.value = true;
    const wrapper = mount(Home);

    expect(wrapper.find("h2").text()).toBe("Willkommen zurück!");
    expect(wrapper.find(".confirm-button").exists()).toBe(false);
  });


  it("zeigt Unauthorized Hinweis", () => {
    isUnauthorized.value = true;
    const wrapper = mount(Home);

    expect(wrapper.find("h2").text()).toBe("Unauthorisiert");
  });
});
