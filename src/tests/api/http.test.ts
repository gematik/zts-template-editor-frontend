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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

vi.mock("../../router", () => ({
  default: {
    push: vi.fn(),
    replace: vi.fn(),
    currentRoute: ref({ path: "/", fullPath: "/projects", name: "home" }),
  },
}));

vi.mock("../../auth/oauth2Proxy", () => ({
  isUnauthorized: ref(false),
  oauth2ProxyStartUrl: vi.fn((rd: string) => `https://app.test/oauth2/start?rd=${encodeURIComponent(rd)}`),
}));

describe("api/http.ts - oauth2-proxy mode", () => {
  let originalLocation: Location;
  let originalAppConfig: unknown;
  let hrefValue = "https://app.test/";

  function mockLocation(params: { origin: string; hostname: string; protocol: string; href?: string }) {
    hrefValue = params.href ?? `${params.origin}/`;
    Object.defineProperty(globalThis, "location", {
      value: {
        origin: params.origin,
        hostname: params.hostname,
        protocol: params.protocol,
        pathname: "/",
        get href() { return hrefValue; },
        set href(v: string) { hrefValue = String(v); },
      } as any,
      configurable: true,
    });
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalLocation = globalThis.location;
    originalAppConfig = (globalThis as any).__APP_CONFIG__;
    (globalThis as any).__APP_CONFIG__ = { API_BASE: "" };
    mockLocation({ origin: "https://app.test", hostname: "app.test", protocol: "https:" });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "location", { value: originalLocation, configurable: true });
    (globalThis as any).__APP_CONFIG__ = originalAppConfig;
  });

  it("setzt Standard-Header, Credentials und keinen Authorization-Header", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { api } = await import("../../api/http");
    const data = await api<{ ok: boolean }>("/ping");

    expect(data.ok).toBe(true);
    const [url, init] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe("https://app.test/ping");
    expect(init.credentials).toBe("include");
    expect(init.headers.get("Accept")).toBe("application/json");
    expect(init.headers.get("Content-Type")).toBeNull();
    expect(init.headers.get("Authorization")).toBeNull();
  });

  it("überschreibt vorhandenen Content-Type Header nicht", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ y: 2 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { api } = await import("../../api/http");
    await api("/custom", { headers: { "Content-Type": "text/custom" } });

    const init = (globalThis.fetch as any).mock.calls[0][1];
    expect(init.headers.get("Content-Type")).toBe("text/custom");
  });

  it("setzt Content-Type nicht bei FormData", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response("ok", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }));

    const { api } = await import("../../api/http");
    const fd = new FormData();
    fd.append("a", "b");
    await api("/form", { method: "POST", body: fd });

    const init = (globalThis.fetch as any).mock.calls[0][1];
    expect(init.headers.get("Content-Type")).not.toBe("application/json");
  });

  it("gibt Text zurück wenn Content-Type nicht JSON ist", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response("plain text", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }));

    const { api } = await import("../../api/http");
    await expect(api<string>("/text")).resolves.toBe("plain text");
  });

  it("leitet bei 401 zu oauth2-proxy start weiter", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response("", { status: 401, statusText: "Unauthorized" }));

    const { api } = await import("../../api/http");
    await expect(api("/protected")).rejects.toThrow(/Unauthorized/);
    expect(String(globalThis.location.href)).toContain("/oauth2/start");
  });

  it("bei 500: wirft Error inkl. Response-Text", async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response("Internal error", {
      status: 500,
      statusText: "Server Error",
    }));

    const { api } = await import("../../api/http");
    await expect(api("/err")).rejects.toThrow(/HTTP 500 Server Error – Internal error/);
  });

  it("ignoriert API_BASE und bleibt bewusst same-origin", async () => {
    (globalThis as any).__APP_CONFIG__ = { API_BASE: "https://proxy.test/" };
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { api } = await import("../../api/http");
    await api("/ping");
    expect((globalThis.fetch as any).mock.calls[0][0]).toBe("https://app.test/ping");
  });

  it("localhost bleibt same-origin und ruft nicht mehr direkt Backend-Port 8080 auf", async () => {
    (globalThis as any).__APP_CONFIG__ = { API_BASE: "" };
    mockLocation({ origin: "http://localhost", hostname: "localhost", protocol: "http:" });
    (globalThis as any).fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const { api } = await import("../../api/http");
    await api("/ping");
    expect((globalThis.fetch as any).mock.calls[0][0]).toBe("http://localhost/ping");
  });
});
