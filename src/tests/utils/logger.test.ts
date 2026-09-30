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

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).__APP_CONFIG__;
  });

  it("schreibt Debug-Logs nur bei aktivierter Runtime-Konfiguration", async () => {
    (globalThis as any).__APP_CONFIG__ = { BROWSER_DEBUG_LOGS: "true" };
    vi.resetModules();

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const mod = await import("../../utils/logger");

    mod.logger.scope("test").debug("debug aktiv");
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });

  it("unterdrückt Debug-Logs bei deaktivierter Runtime-Konfiguration", async () => {
    (globalThis as any).__APP_CONFIG__ = { BROWSER_DEBUG_LOGS: "false" };
    vi.resetModules();

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const mod = await import("../../utils/logger");

    mod.logger.scope("test").debug("debug inaktiv");
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
