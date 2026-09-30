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

import { describe, it, expect, vi, afterEach } from "vitest";

describe("runtimeConfig", () => {
    const ORIGINAL = (globalThis as any).__APP_CONFIG__;
    const ENV_ZTS = (import.meta as any).env?.VITE_ZTS_URL;
    const ENV_DEBUG = (import.meta as any).env?.VITE_BROWSER_DEBUG_LOGS;

    const expectedDefaultZts = ENV_ZTS ?? "https://terminologien.bfarm.de";
    const expectedDefaultDebug = "true" === String(ENV_DEBUG ?? "").toLowerCase();

    afterEach(() => {
        (globalThis as any).__APP_CONFIG__ = ORIGINAL;
        vi.resetModules();
    });

    it("nutzt Default, wenn __APP_CONFIG__ fehlt", async () => {
        delete (globalThis as any).__APP_CONFIG__;
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.ZTS_URL).toBe(expectedDefaultZts);
        expect(mod.runtimeConfig.BROWSER_DEBUG_LOGS).toBe(expectedDefaultDebug);
    });

    it("nutzt Werte aus __APP_CONFIG__", async () => {
        (globalThis as any).__APP_CONFIG__ = {
            ZTS_URL: "https://example.com",
            BROWSER_DEBUG_LOGS: "true",
        };
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.ZTS_URL).toBe("https://example.com");
        expect(mod.runtimeConfig.BROWSER_DEBUG_LOGS).toBe(true);
    });

    it("fällt auf Default zurück, wenn Werte nicht gesetzt sind (Partial)", async () => {
        (globalThis as any).__APP_CONFIG__ = {};
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.ZTS_URL).toBe(expectedDefaultZts);
        expect(mod.runtimeConfig.BROWSER_DEBUG_LOGS).toBe(expectedDefaultDebug);
    });

    it("fällt auf Default zurück, wenn Werte undefined sind", async () => {
        (globalThis as any).__APP_CONFIG__ = {
            ZTS_URL: undefined,
            BROWSER_DEBUG_LOGS: undefined,
        };
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.ZTS_URL).toBe(expectedDefaultZts);
        expect(mod.runtimeConfig.BROWSER_DEBUG_LOGS).toBe(expectedDefaultDebug);
    });

    it("interpretiert numerische Poll-Intervalle aus __APP_CONFIG__", async () => {
        (globalThis as any).__APP_CONFIG__ = {
            DEFAULT_POLL_INTERVAL_MS: "15000",
        };
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.DEFAULT_POLL_INTERVAL_MS).toBe(15000);
    });

    it("ignoriert ungültige Poll-Intervalle und nutzt den Default", async () => {
        (globalThis as any).__APP_CONFIG__ = {
            DEFAULT_POLL_INTERVAL_MS: "invalid",
        };
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.DEFAULT_POLL_INTERVAL_MS).toBe(10 * 60 * 1000);
    });

    it("interpretiert unbekannte Werte für Browser-Debug-Logs als false", async () => {
        (globalThis as any).__APP_CONFIG__ = {
            BROWSER_DEBUG_LOGS: "debug",
        };
        vi.resetModules();

        const mod = await import("../config");
        expect(mod.runtimeConfig.BROWSER_DEBUG_LOGS).toBe(false);
    });
});
