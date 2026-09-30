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

import { runtimeConfig } from '../config';

const PREFIX = '[TplEditor]';

function normalizeScope(scope?: string): string {
  return scope ? `[${scope}]` : '';
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildPrefix(level: string, scope?: string): string {
  return `${PREFIX}${normalizeScope(scope)}[${level}] ${nowIso()}`;
}

export function isDebugLoggingEnabled(): boolean {
  return runtimeConfig.BROWSER_DEBUG_LOGS;
}

function write(level: 'debug' | 'info' | 'warn' | 'error', scope: string | undefined, message: string, ...args: unknown[]) {
  const prefix = buildPrefix(level.toUpperCase(), scope);

  switch (level) {
    case 'debug':
      if (!isDebugLoggingEnabled()) return;
      console.debug(prefix, message, ...args);
      return;
    case 'info':
      console.info(prefix, message, ...args);
      return;
    case 'warn':
      console.warn(prefix, message, ...args);
      return;
    case 'error':
      console.error(prefix, message, ...args);
      return;
  }
}

export const logger = {
  debug(message: string, ...args: unknown[]) {
    write('debug', undefined, message, ...args);
  },
  info(message: string, ...args: unknown[]) {
    write('info', undefined, message, ...args);
  },
  warn(message: string, ...args: unknown[]) {
    write('warn', undefined, message, ...args);
  },
  error(message: string, ...args: unknown[]) {
    write('error', undefined, message, ...args);
  },
  scope(scope: string) {
    return {
      debug(message: string, ...args: unknown[]) {
        write('debug', scope, message, ...args);
      },
      info(message: string, ...args: unknown[]) {
        write('info', scope, message, ...args);
      },
      warn(message: string, ...args: unknown[]) {
        write('warn', scope, message, ...args);
      },
      error(message: string, ...args: unknown[]) {
        write('error', scope, message, ...args);
      },
    };
  },
};
