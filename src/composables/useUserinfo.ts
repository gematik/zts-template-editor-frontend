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

import { getUserInfo, sanitizeExternalUrl } from "../api/userinfo";
import type { UserInfo } from "../types";
import { ref, computed } from "vue";
import { logger } from "../utils/logger";

const userInfo = ref<UserInfo | null>(null);
const isLoading = ref(false);
const error = ref<Error | null>(null);
let fetchPromise: Promise<UserInfo | null> | null = null;
const userInfoLogger = logger.scope("useUserinfo");

export async function fetchUserInfo(force: boolean = false): Promise<UserInfo | null> {
  if (!force && userInfo.value !== null) {
    userInfoLogger.debug("User information from the cache is used.");
    return userInfo.value;
  }

  if (fetchPromise !== null) {
    userInfoLogger.debug("A concurrent user information request has been detected. The existing promise will be used.");
    await fetchPromise;
    return userInfo.value;
  }

  isLoading.value = true;
  error.value = null;

  userInfoLogger.debug("User information is loaded from backend.", { force });

  fetchPromise = getUserInfo()
    .then(data => {
      userInfoLogger.debug("User information loaded successfully.", { hasUser: !!data, name: data?.name ?? null });
      userInfo.value = data;
      return data;
    })
    .catch(err => {
      userInfoLogger.debug("User information is not available.", err);
      userInfo.value = null;
      error.value = err as Error;
      throw err;
    })
    .finally(() => {
      isLoading.value = false;
      fetchPromise = null;
    });

  await fetchPromise;
  return userInfo.value;
}

export function clearUserInfo(): void {
  userInfoLogger.debug("User information is removed from local state.");
  userInfo.value = null;
  fetchPromise = null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function useUserinfo() {
  const isReviewer = computed(() => userInfo.value?.is_reviewer ?? false);
  const displayName = computed(() => userInfo.value?.name ?? "");
  const profilePicture = computed(() => "");
  const profileUrl = computed(() => sanitizeExternalUrl(userInfo.value?.profile) ?? "");
  const initials = computed(() => initialsFromName(displayName.value));

  return {
    userInfo: computed(() => userInfo.value),
    isReviewer,
    displayName,
    profilePicture,
    profileUrl,
    initials,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    fetchUserInfo,
    clearUserInfo,
    refresh: () => fetchUserInfo(true),
  };
}
