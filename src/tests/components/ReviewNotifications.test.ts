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
import { nextTick } from "vue";
import { REVIEW_APPROVED_EVENT } from "../../utils/events";

const {
  routerPushMock,
  loadProjectsMock,
  fetchUserInfoMock,
  authState,
  reviewerState,
  loadingState,
  projectsState,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  loadProjectsMock: vi.fn(),
  fetchUserInfoMock: vi.fn(),

  authState: { value: true },
  reviewerState: { value: true },
  loadingState: { value: false },
  projectsState: { value: [] as any[] },
}));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();

  return {
    ...actual,
    useRouter: () => ({
      push: routerPushMock,
    }),
  };
});

vi.mock("../../auth/oauth2Proxy", () => ({
  isAuthenticated: authState,
  markAuthenticated: vi.fn(() => { authState.value = true; }),
  clearAuthState: vi.fn(() => { authState.value = false; }),
  oauth2ProxyStartUrl: vi.fn(() => "https://app.example.test/oauth2/start"),
  oauth2ProxySignOutUrl: vi.fn(() => "https://app.example.test/oauth2/sign_out"),
  isUnauthorized: { value: false },
}));

vi.mock("../../composables/useUserinfo", () => ({
  useUserinfo: () => ({
    isReviewer: reviewerState,
    fetchUserInfo: fetchUserInfoMock,
  }),
}));

vi.mock("../../composables/useProjects", async () => {
  const actual = await vi.importActual<typeof import("../../composables/useProjects")>(
    "../../composables/useProjects"
  );

  return {
    ...actual,
    useProjects: () => ({
      loadProjects: loadProjectsMock,
      loading: loadingState,
      reviewNotifications: {
        get value() {
          return actual.buildReviewNotifications(projectsState.value as any);
        },
      },
      isReviewNotificationShownByDefault: actual.isReviewNotificationShownByDefault,
    }),
  };
});

import ReviewNotifications from "../../components/ReviewNotifications.vue";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

async function mountAndFlush() {
  const wrapper = mount(ReviewNotifications);
  await flush();
  return wrapper;
}

function createProject(projectId: number, title: string, lastModified = "2026-03-12T10:00:00.000Z") {
  return {
    projectId,
    title,
    description: "desc",
    lastModified,
  };
}

describe("ReviewNotifications.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T16:00:00.000Z"));

    authState.value = true;
    reviewerState.value = true;
    loadingState.value = false;
    projectsState.value = [];

    fetchUserInfoMock.mockResolvedValue({ is_reviewer: true, name: "Reviewer", groups: [] });
    loadProjectsMock.mockImplementation(async () => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("refreshNotifications filtert auf relevante Review-Status", async () => {
    projectsState.value = [
      {
        ...createProject(10, "pkg-alpha"),
        versions: [
          {
            version: "1.0.0",
            branch: "feature/1.0.0",
            mrStatus: "in Review",
            mergeRequest: { id: 101, webUrl: "https://gitlab.local/mr/101" },
            lastModified: "2026-03-12T11:00:00.000Z",
          },
          {
            version: "0.9.0",
            branch: "feature/0.9.0",
            mrStatus: "Draft",
            mergeRequest: { id: 102, webUrl: "https://gitlab.local/mr/102" },
            lastModified: "2026-03-12T10:00:00.000Z",
          },
          {
            version: "1.1.0",
            branch: "feature/1.1.0",
            mrStatus: "Released Edit",
            mergeRequest: { id: 103, webUrl: "https://gitlab.local/mr/103" },
            lastModified: "2026-03-12T09:00:00.000Z",
          },
          {
            version: "1.2.0",
            branch: "",
            mrStatus: "in Review",
            mergeRequest: { id: 104, webUrl: "https://gitlab.local/mr/104" },
            lastModified: "2026-03-12T09:00:00.000Z",
          },
        ],
      },
    ];

    const wrapper = await mountAndFlush();

    expect(loadProjectsMock).not.toHaveBeenCalled();

    const vm = wrapper.vm as any;
    expect(vm.notifications.length).toBe(2);
    expect(vm.notifications.some((n: any) => n.version === "1.0.0")).toBe(true);
    expect(vm.notifications.some((n: any) => n.version === "1.1.0")).toBe(true);
    expect(vm.notifications.some((n: any) => n.version === "0.9.0")).toBe(false);

    wrapper.unmount();
  });

  it("lädt Projektdaten wenn noch keine vorhanden sind", async () => {
    loadProjectsMock.mockImplementation(async () => {
      projectsState.value = [
        {
          ...createProject(99, "pkg-load"),
          versions: [
            {
              version: "1.0.0",
              branch: "feature/1.0.0",
              mrStatus: "in Review",
              mergeRequest: { id: 999, webUrl: "https://gitlab.local/mr/999" },
              lastModified: "2026-03-12T11:00:00.000Z",
            },
          ],
        },
      ];
    });

    const wrapper = await mountAndFlush();
    const vm = wrapper.vm as any;

    expect(loadProjectsMock).toHaveBeenCalledTimes(1);
    expect(vm.notifications.length).toBe(1);
    expect(vm.notifications[0].version).toBe("1.0.0");

    wrapper.unmount();
  });

  it("klick auf Prüfen navigiert zur kodierten Zielroute", async () => {
    projectsState.value = [
      {
        ...createProject(11, "my pkg/a"),
        versions: [
          {
            version: "1.0.0",
            branch: "feature/1.0.0 test",
            mrStatus: "in Review",
            mergeRequest: { id: 201, webUrl: "https://gitlab.local/mr/201" },
            lastModified: "2026-03-12T12:00:00.000Z",
          },
        ],
      },
    ];

    const wrapper = await mountAndFlush();

    const buttons = wrapper.findAll("button");
    const checkButton = buttons.find((btn) => btn.text().includes("Änderungen prüfen"));
    expect(checkButton).toBeDefined();

    await checkButton!.trigger("click");

    expect(routerPushMock).toHaveBeenCalledWith({
      path: "/projects/11/my%20pkg%2Fa/versions/1.0.0/feature%2F1.0.0%20test",
    });

    wrapper.unmount();
  });

  it("rendert GitLab-Link nur mit vorhandener URL", async () => {
    projectsState.value = [
      {
        ...createProject(12, "pkg-beta"),
        versions: [
          {
            version: "1.0.0",
            branch: "feature/1.0.0",
            mrStatus: "in Review",
            mergeRequest: { id: 301, webUrl: "https://gitlab.local/mr/301" },
            lastModified: "2026-03-12T13:00:00.000Z",
          },
          {
            version: "1.0.1",
            branch: "feature/1.0.1",
            mrStatus: "in Review",
            mergeRequest: { id: 302 },
            lastModified: "2026-03-12T12:00:00.000Z",
          },
        ],
      },
    ];

    const wrapper = await mountAndFlush();

    const html = wrapper.html();
    const renderedUrls = html.match(/https:\/\/gitlab\.local\/mr\/301/g) ?? [];

    expect(renderedUrls).toHaveLength(1);
    expect(html).not.toContain("https://gitlab.local/mr/302");

    wrapper.unmount();
  });

  it("berechnet hiddenCount für alte Benachrichtigungen", async () => {
    projectsState.value = [
      {
        ...createProject(13, "pkg-gamma"),
        versions: [
          {
            version: "3.0.0",
            branch: "feature/3.0.0",
            mrStatus: "in Review",
            mergeRequest: { id: 401, webUrl: "https://gitlab.local/mr/401" },
            lastModified: new Date().toISOString(),
          },
          {
            version: "2.0.0",
            branch: "feature/2.0.0",
            mrStatus: "review",
            mergeRequest: { id: 402, webUrl: "https://gitlab.local/mr/402" },
            lastModified: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    ];

    const wrapper = await mountAndFlush();

    const vm = wrapper.vm as any;
    expect(vm.notifications.length).toBe(2);
    expect(vm.visibleExtraNotificationsCount).toBe(1);
    expect(vm.hiddenCount).toBe(1);

    wrapper.unmount();
  });

  it("refreshNotifications dedupliziert nach project+mr und sortiert nach Datum", async () => {
    projectsState.value = [
      {
        ...createProject(1, "pkg-a"),
        versions: [
          {
            version: "1.0.0",
            branch: "feature/1.0.0",
            mrStatus: "in Review",
            mergeRequest: { id: 900, webUrl: "https://gitlab.local/mr/900" },
            lastModified: "2026-03-12T10:00:00.000Z",
          },
          {
            version: "1.0.1",
            branch: "feature/1.0.1",
            mrStatus: "in Review",
            mergeRequest: { id: 900, webUrl: "https://gitlab.local/mr/900" },
            lastModified: "2026-03-12T11:00:00.000Z",
          },
        ],
      },
      {
        ...createProject(2, "pkg-b"),
        versions: [
          {
            version: "2.0.0",
            branch: "feature/2.0.0",
            mrStatus: "review",
            mergeRequest: { id: 901, webUrl: "https://gitlab.local/mr/901" },
            lastModified: "2026-03-12T12:00:00.000Z",
          },
        ],
      },
    ];

    const wrapper = await mountAndFlush();
    const vm = wrapper.vm as any;

    expect(vm.notifications.length).toBe(2);
    expect(vm.notifications[0].version).toBe("2.0.0");
    expect(vm.notifications[1].version).toBe("1.0.1");
    expect(vm.notifications.some((n: any) => n.version === "1.0.0")).toBe(false);

    wrapper.unmount();
  });

  it("lädt keine Benachrichtigungen wenn nicht authentifiziert", async () => {
    authState.value = false;

    const wrapper = await mountAndFlush();
    const vm = wrapper.vm as any;

    expect(loadProjectsMock).not.toHaveBeenCalled();
    expect(vm.notifications).toEqual([]);

    wrapper.unmount();
  });

  it("lädt keine Projekte wenn Reviewer-Recht fehlt", async () => {
    authState.value = false;

    const wrapper = await mountAndFlush();
    const vm = wrapper.vm as any;

    expect(loadProjectsMock).not.toHaveBeenCalled();
    expect(vm.notifications).toEqual([]);

    wrapper.unmount();
  });

  it("setzt Benachrichtigungen zurück wenn loadProjects fehlschlägt", async () => {
    loadProjectsMock.mockRejectedValueOnce(new Error("boom"));

    const wrapper = await mountAndFlush();
    const vm = wrapper.vm as any;

    await vm.refreshNotifications();
    expect(vm.notifications).toEqual([]);

    wrapper.unmount();
  });

  it("startet Polling nur wenn Benachrichtigungen sichtbar sein dürfen", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    reviewerState.value = false;
    const wrapperNoAuth = await mountAndFlush();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    wrapperNoAuth.unmount();

    setIntervalSpy.mockClear();

    authState.value = true;
    reviewerState.value = true;
    projectsState.value = [
      {
        ...createProject(77, "pkg-visible"),
        versions: [
          {
            version: "1.0.0",
            branch: "feature/1.0.0",
            mrStatus: "in Review",
            mergeRequest: { id: 771, webUrl: "https://gitlab.local/mr/771" },
            lastModified: "2026-03-12T12:00:00.000Z",
          },
        ],
      },
    ];
    const wrapperVisible = await mountAndFlush();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    wrapperVisible.unmount();
  });

  it("beendet Polling beim Unmount", async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const wrapper = await mountAndFlush();
    wrapper.unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it("entfernt Benachrichtigung nach review-approved Event", async () => {
    projectsState.value = [
      {
        ...createProject(55, "pkg-event"),
        versions: [
          {
            version: "1.2.3",
            branch: "feature/1.2.3",
            mrStatus: "in Review",
            mergeRequest: { id: 777, webUrl: "https://gitlab.local/mr/777" },
            lastModified: "2026-03-12T12:00:00.000Z",
          },
        ],
      },
    ];

    const wrapper = await mountAndFlush();
    const vm = wrapper.vm as any;

    expect(vm.notifications.length).toBe(1);
    expect(vm.notifications[0].key).toBe("55@@777");

    window.dispatchEvent(new CustomEvent(REVIEW_APPROVED_EVENT, {
      detail: { projectId: 55, mrId: 777 },
    }));
    await flush();

    expect(vm.notifications).toEqual([]);

    wrapper.unmount();
  });
});
