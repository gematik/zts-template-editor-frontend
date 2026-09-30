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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCollapseTransition, NIcon, NSpace, NText, NTooltip } from 'naive-ui';
import { isAuthenticated } from '../auth/oauth2Proxy';
import { REVIEW_APPROVED_EVENT, isReviewApprovedEvent } from '../utils/events';
import { useUserinfo } from '../composables/useUserinfo';
import { useProjects } from '../composables/useProjects';

const router = useRouter();
const { isReviewer } = useUserinfo();
const {
  reviewNotifications,
  isReviewNotificationShownByDefault,
  loadProjects,
  loading,
} = useProjects();

const notifications = ref(reviewNotifications.value);
const showAll = ref(false);
const HISTORY_DISPLAY_DURATION_MS = 48 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 60 * 1000;
let pollHandle: number | undefined;

const canShow = computed(() => isAuthenticated.value && isReviewer.value);

function formatLastEdited(value?: string): string {
  if (!value) return 'unbekannt';

  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'unbekannt';

  const formatted = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(time);

  return `${formatted} Uhr`;
}

const visibleExtraNotificationsCount = computed(() => {
  return notifications.value.filter((item) => isReviewNotificationShownByDefault(item)).length;
});

const hiddenCount = computed(() => {
  return Math.max(0, notifications.value.length - visibleExtraNotificationsCount.value);
});

function stopPolling() {
  if (pollHandle !== undefined) {
    clearInterval(pollHandle);
    pollHandle = undefined;
  }
}

function startPolling() {
  if (pollHandle !== undefined) return;

  pollHandle = globalThis.setInterval(() => {
    refreshNotifications();
  }, POLL_INTERVAL_MS);
}

async function refreshNotifications() {
  if (!canShow.value) {
    notifications.value = [];
    return;
  }

  try {
    if (!reviewNotifications.value.length && !loading.value) {
      await loadProjects();
    }

    notifications.value = reviewNotifications.value;
  } catch {
    notifications.value = [];
  }
}

function openChanges(item: typeof notifications.value[number]) {
  const targetPath = `/projects/${encodeURIComponent(String(item.projectId))}/${encodeURIComponent(item.packageName)}/versions/${encodeURIComponent(item.version)}/${encodeURIComponent(item.branch)}`;
  router.push({ path: targetPath });
}

function updateVisibilityState(isVisible: boolean) {
  if (isVisible) {
    void refreshNotifications();
    startPolling();
    return;
  }

  notifications.value = [];
  stopPolling();
}

onMounted(() => {
  updateVisibilityState(canShow.value);
  globalThis.addEventListener(REVIEW_APPROVED_EVENT, onReviewApproved);
});

watch(canShow, (isVisible) => {
  updateVisibilityState(isVisible);
});

watch(reviewNotifications, (nextNotifications) => {
  notifications.value = canShow.value ? nextNotifications : [];
}, { deep: true });

onUnmounted(() => {
  stopPolling();
  globalThis.removeEventListener(REVIEW_APPROVED_EVENT, onReviewApproved);
});

function onReviewApproved(event: Event) {
  if (!isReviewApprovedEvent(event)) return;

  notifications.value = notifications.value.filter((item) => item.key !== `${event.detail.projectId}@@${event.detail.mrId}`);
}
</script>

<template>
  <div v-if="canShow && notifications.length">
    <TransitionGroup name="notifications-list" tag="div" class="relative">
      <div v-for="item in notifications" :key="item.key">
        <NCollapseTransition :show="showAll || isReviewNotificationShownByDefault(item)" appear>
          <NAlert type="info" :show-icon="true" class="mb-1.5">
            <NSpace
              direction="horizontal"
              size="small"
              justify="space-between"
              wrap
              align="center"
              class="-my-1"
            >
              <NSpace direction="horizontal" size="small">
                <NText>Änderungen in</NText>
                <NText strong>{{ item.packageName }} @ {{ item.version }}</NText>
                <NSpace direction="horizontal" :size="3">
                  <template
                    v-for="badge in item.badges"
                    :key="`${item.key}@@${badge.label}`"
                  >
                    <NTooltip v-if="badge.tooltip" trigger="hover">
                      <template #trigger>
                        <span :class="['badge', 'badge-compact', badge.className]">
                          {{ badge.label }}
                        </span>
                      </template>
                      {{ badge.tooltip }}
                    </NTooltip>
                    <span v-else :class="['badge', 'badge-compact', badge.className]">
                      {{ badge.label }}
                    </span>
                  </template>
                </NSpace>
                <small class="text-gray-500">{{ formatLastEdited(item.lastModified) }}</small>
                <NSpace direction="horizontal" />
              </NSpace>
              <NSpace direction="horizontal" size="small" align="center">
                <NTooltip trigger="hover">
                  <template #trigger>
                    <NButton size="small" type="success" @click="openChanges(item)">
                      Änderungen prüfen
                    </NButton>
                  </template>
                  Detailansicht der Version öffnen, um die Änderungen zu prüfen und gegebenenfalls freizugeben.
                </NTooltip>
                <NTooltip trigger="hover">
                  <template #trigger>
                    <NButton
                      tag="a"
                      :href="item.mergeRequest?.webUrl"
                      :aria-label="item.mergeRequest?.webUrl ? 'Merge Request auf GitLab öffnen' : 'Keine GitLab-URL verfügbar'"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      :disabled="!item.mergeRequest?.webUrl"
                    >
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                          <path d="M14 3h7v7M21 3l-9 9M10 5H5v16h16v-5"/>
                        </svg>
                      </NIcon>
                    </NButton>
                  </template>
                  {{ item.mergeRequest?.webUrl ? 'Merge Request auf GitLab öffnen' : 'Keine GitLab-URL verfügbar' }}
                </NTooltip>
              </NSpace>
            </NSpace>
          </NAlert>
        </NCollapseTransition>
      </div>
    </TransitionGroup>
    <div v-if="hiddenCount > 0" class="text-left w-full">
      <NAlert
        type="info"
        show-icon
        bordered
        class="mb-1.5 inline-flex border-l-2 border-cyan-800/60"
      >
        <NSpace direction="horizontal" size="small" justify="start" wrap align="center" class="-my-1">
          <NText>
            {{ hiddenCount }} Benachrichtigung{{ hiddenCount > 1 ? 'en' : '' }} älter als {{ HISTORY_DISPLAY_DURATION_MS / (60 * 60 * 1000) }} Stunde{{ HISTORY_DISPLAY_DURATION_MS / (60 * 60 * 1000) > 1 ? 'n' : '' }}.
          </NText>
          <NButton size="small" type="info" secondary @click="showAll = !showAll">
            {{ showAll ? `Ausblenden` : 'Anzeigen' }}
          </NButton>
        </NSpace>
      </NAlert>
    </div>
  </div>
</template>

<style scoped>
.badge-compact {
  min-height: 1.35rem;
  padding-block: 0.15rem;
}

/* Modifies the default transition for notifications list */
.notifications-list-move,
.notifications-list-enter-active,
.notifications-list-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.notifications-list-enter-from,
.notifications-list-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.985);
}

.notifications-list-leave-active {
  pointer-events: none;
  position: absolute;
  width: 100%;
}
</style>
