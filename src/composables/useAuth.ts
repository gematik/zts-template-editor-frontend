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

import { useRouter } from "vue-router";
import { ref, computed } from "vue";
import { useUserinfo } from "./useUserinfo";
import { logger } from "../utils/logger";
import {
  checkOAuth2ProxySession,
  clearAuthState,
  isAuthenticated,
  isUnauthorized,
  oauth2ProxySignOutUrl,
  oauth2ProxyStartUrl,
  markAuthenticated,
} from "../auth/oauth2Proxy";

const isLoggedInState = ref<boolean>(false);
const authLogger = logger.scope("useAuth");

export function useAuth() {
  const router = useRouter();
  const isLoggingIn = ref(false);
  const isLoggingOut = ref(false);
  const isCheckingAuth = ref(false);
  const { fetchUserInfo, clearUserInfo } = useUserinfo();

  function login(returnTo: string = globalThis.location.href) {
    isLoggingIn.value = true;
    authLogger.info("Login via oauth2-proxy started.");
    globalThis.location.href = oauth2ProxyStartUrl(returnTo);
  }

  function logout(returnTo: string = new URL("/", globalThis.location.origin).toString()) {
    isLoggingOut.value = true;
    authLogger.info("Logout via oauth2-proxy started.");

    clearUserInfo();
    clearAuthState();
    isLoggedInState.value = false;

    globalThis.location.href = oauth2ProxySignOutUrl(returnTo);
  }

  async function checkAuthStatus(): Promise<boolean> {
    isCheckingAuth.value = true;

    try {
      const authenticated = await checkOAuth2ProxySession();

      if (authenticated) {
        markAuthenticated();
        await fetchUserInfo(true);
        isLoggedInState.value = true;
        return true;
      }

      clearUserInfo();
      clearAuthState();
      isLoggedInState.value = false;
      isUnauthorized.value = false;
      return false;
    } catch (error) {
      authLogger.warn("oauth2-proxy auth check failed.", { error });
      clearUserInfo();
      clearAuthState();
      isLoggedInState.value = false;
      return false;
    } finally {
      isCheckingAuth.value = false;
    }
  }

  const isLoggedIn = computed(() => isLoggedInState.value && isAuthenticated.value);

  return {
    router,
    isLoggedIn,
    isCheckingAuth,
    isLoggingIn,
    isLoggingOut,
    login,
    logout,
    checkAuthStatus,
  };
}
