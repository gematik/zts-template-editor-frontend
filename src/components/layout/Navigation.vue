<!--
  - Copyright (Change Date see Readme), gematik GmbH
  -
  - Licensed under the Apache License, Version 2.0 (the "License");
  - you may not use this file except in compliance with the License.
  - You may obtain a copy of the License at
  -
  -     http://www.apache.org/licenses/LICENSE-2.0
  -
  - Unless required by applicable law or agreed to in writing, software
  - distributed under the License is distributed on an "AS IS" BASIS,
  - WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  - See the License for the specific language governing permissions and
  - limitations under the License.
  -
  - *******
  -
  - For additional notes and disclaimer from gematik and in case of changes
  - by gematik, find details in the "Readme" file.
  -->

<script setup lang="ts">
import { useAuth } from "../../composables/useAuth";
import { useUserinfo } from "../../composables/useUserinfo";

const { isLoggedIn, login, logout, isLoggingIn, isLoggingOut } = useAuth();
const {
  isReviewer,
  displayName,
} = useUserinfo();

function handleLogin() {
  login();
}

function handleLogout() {
  logout();
}
</script>

<template>
  <!-- Navigation -->
  <nav class="container mx-auto px-4 max-w-5xl flex justify-between items-center py-2">
    <ul class="flex space-x-1">
      <li>
        <router-link to="/" class="nav-link text-lg font-semibold"
          :class="{ active: $route.path === '/' }">Home</router-link>
      </li>

      <li>
        <router-link to="/projects" class="nav-link text-lg font-semibold"
          :class="{ active: $route.path === '/projects' }">Dashboard</router-link>
      </li>
    </ul>

    <ul class="flex space-x-4">
      <li v-if="isLoggedIn" class="flex items-center gap-1">
        <span>Willkommen,</span>

        <span>{{ displayName || 'angemeldet' }}<template v-if="displayName"> {{ isReviewer ? '(Reviewer)' : '(Publisher)' }}</template></span>
      </li>

      <li v-if="isLoggedIn">
        <a @click.prevent="handleLogout"
           class="nav-link text-lg font-semibold cursor-pointer"
           :class="{ 'opacity-50 pointer-events-none': isLoggingOut }">
          <img src="@/assets/images/logout.svg" alt="Logout" class="w-6 h-6 login-link" />
          {{ isLoggingOut ? 'Wird abgemeldet...' : 'Abmelden' }}
        </a>
      </li>
      <li v-else>
        <a @click.prevent="handleLogin"
           class="nav-link text-lg font-semibold cursor-pointer"
           :class="{ 'opacity-50 pointer-events-none': isLoggingIn }">
          <img src="@/assets/images/login.svg" alt="Anmelden" class="w-6 h-6 login-link" />
          {{ isLoggingIn ? 'Wird angemeldet...' : 'Anmelden' }}
        </a>
      </li>
    </ul>
  </nav>
</template>
