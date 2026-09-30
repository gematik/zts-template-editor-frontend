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

/**
 * Safely parses a value into a typed object.
 *
 * Behavior:
 * - Parses JSON strings
 * - Returns objects as-is
 * - Falls back to a default value on invalid input or parsing errors
 *
 * Prevents runtime crashes from malformed backend data.
 */
export const safeParse = <T>(val: unknown, fallback: T): T => {
  try {
    if (val == null) return fallback;
    if (typeof val === 'string') return JSON.parse(val) as T;
    if (typeof val === 'object') return val as T;
    return fallback;
  } catch {
    return fallback;
  }
};
