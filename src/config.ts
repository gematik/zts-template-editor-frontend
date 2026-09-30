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

type AppConfig = {
    ZTS_URL: string;
    BROWSER_DEBUG_LOGS: boolean;

    DEFAULT_POLL_INTERVAL_MS?: number;
};

declare global {
    interface Global {
        __APP_CONFIG__?: Partial<AppConfig>;
    }

    var __APP_CONFIG__: Partial<AppConfig> | undefined;
}

const globalConfig = (globalThis as typeof globalThis & {
    __APP_CONFIG__?: Partial<AppConfig>;
}).__APP_CONFIG__;

const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
}).env;

function parseBooleanFlag(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;

    return value === "true";
}

function parseOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string' || value.trim() === "") return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export const runtimeConfig: AppConfig = {
    ZTS_URL: globalConfig?.ZTS_URL ?? viteEnv?.VITE_ZTS_URL ?? "https://terminologien.bfarm.de",
    BROWSER_DEBUG_LOGS: parseBooleanFlag(globalConfig?.BROWSER_DEBUG_LOGS ?? viteEnv?.VITE_BROWSER_DEBUG_LOGS),

    DEFAULT_POLL_INTERVAL_MS: parseOptionalNumber(globalConfig?.DEFAULT_POLL_INTERVAL_MS)
        ?? parseOptionalNumber(viteEnv?.VITE_DEFAULT_POLL_INTERVAL_MS)
        ?? 10 * 60 * 1000,
};
