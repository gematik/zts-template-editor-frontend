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

import { watch, onUnmounted, type Ref } from 'vue';
import type { StatusMessageState } from '../types';

export function useStatusMessage(statusMessage: Ref<StatusMessageState>) {
  let statusTimer: ReturnType<typeof setTimeout> | null = null;

  const clearStatusTimer = () => {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  };

  const scheduleStatusReset = () => {
    clearStatusTimer();
    if (statusMessage.value.message && statusMessage.value.type !== 'error') {
      statusTimer = setTimeout(() => {
        statusMessage.value = { type: null, message: null };
      }, 5000);
    }
  };

  watch(
    () => [statusMessage.value.message, statusMessage.value.type] as const,
    scheduleStatusReset,
    { immediate: true }
  );

  onUnmounted(clearStatusTimer);

  return {
    setStatus: (type: string | null, msg: string | null) => {
      statusMessage.value = { type, message: msg } as StatusMessageState;
    },
  };
}
