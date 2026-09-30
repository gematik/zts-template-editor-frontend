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
import { onMounted, onUnmounted, watch } from 'vue';
import { useProjects } from '../composables/useProjects';
import { NButton, NSpace, NSpin, NAlert, NTooltip, useDialog } from 'naive-ui';
import { useStatusMessage } from '../composables/useStatusMessage';

const dialog = useDialog();
const {
  loading,
  progress,
  statusMessage,
  projects,
  lastUpdated,
  isLoggedIn,
  fmtDate,
  loadProjects,
  startAutoRefresh,
  stopAutoRefresh,
  clearProjects,
  badgeClass,
  toggleVersions,
  onAddNewVersion,
  deleteVersion,
  canEdit
} = useProjects();


const onDeleteVersion = (projectId: number, version: string, branch: string) => {
  dialog.warning({
    title: "Version löschen?",
    content: `Wollen Sie wirklich die Version "${version}" aus dem Projekt löschen?`,
    positiveText: "Ja, löschen",
    negativeText: "Abbrechen",
    maskClosable: false,
    onPositiveClick: () => {
      deleteVersion(projectId, version, branch);
    }
  });
};

useStatusMessage(statusMessage);


onMounted(() => {
  startAutoRefresh();
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
    clearProjects();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});

</script>

<template>
  <div v-if="!isLoggedIn" class="text-center py-10">
    <NAlert type="info">
      Bitte melden Sie sich an, um Templates zu bearbeiten.
    </NAlert>
  </div>
  <template v-else>
  <main>
    <h2 class="projects-title">Übersicht der Projekte</h2>

    <!-- Toolbar -->
    <div class="projects-toolbar">
      <button v-if="isLoggedIn" @click="loadProjects" :disabled="loading" class="projects-refresh">
        <img src="@/assets/images/refresh-circle.svg" alt="Projekte neu laden" />
        Neu laden
      </button>
      <p v-if="lastUpdated" class="projects-lastupdate">
        Letzte Aktualisierung: {{ fmtDate(lastUpdated.toISOString()) }}
      </p>
    </div>

    <!-- Progress -->
    <div v-if="loading" class="projects-progress">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>

    <div v-if="statusMessage.message" class="mt-4">
      <NAlert :type="statusMessage.type || 'info'" :title="statusMessage.title || (statusMessage.type === 'error' ? 'Fehler' : 'Hinweis')"
        show-icon closable @close="statusMessage.message = null; statusMessage.title = null; statusMessage.debug = null">
        <div>{{ statusMessage.message }}</div>
        <div v-if="statusMessage.debug" class="mt-1 text-xs text-gray-500">{{ statusMessage.debug }}</div>
      </NAlert>
    </div>

    <!-- Projects Accordion -->
    <div v-if="projects.length" class="projects-accordion">
      <div v-for="p in projects" :key="p.projectId" class="accordion-item">

        <!-- Header -->
        <div class="accordion-header-wrapper">
          <button class="accordion-header" @click="toggleVersions(p)">
            <div>
              <strong class="accordion-title">FHIR Package – {{ p.title }}</strong>
              <div class="accordion-subtitle">
                {{ p.description }} </div>
              <div class="accordion-subtitle font-semibold">Letzte Änderung: {{ fmtDate(p.lastModified) }}</div>

            </div>
            <NTooltip v-if="p.mrStatus === 'Released Edit'" trigger="hover">
              <template #trigger>
                <span :class="['badge', badgeClass('in Review')]"><strong>in Review</strong></span>
              </template>
              Diese Version ist bereits veröffentlicht und hat aktuell Änderungen im Review.
            </NTooltip>
            <span v-else :class="['badge', badgeClass(p.mrStatus ?? '')]"><strong>{{ p.mrStatus }}</strong></span>
          </button>
        </div>
        <!-- Body -->
        <transition name="fade">
          <div v-show="p.expanded" class="accordion-body">
            <div class="my-1 ml-1">
              <NTooltip trigger="hover">
                <template #trigger>
                  <NButton size="small" type="success" @click.stop="onAddNewVersion(String(p.projectId), p.title)"
                    :title="canEdit ? 'Neue Version hinzufügen' : 'Als Reviewer haben Sie keine Berechtigung neue Version hinzuzufügen'"
                    class="my-3 ml-3 flex-shrink-0" :disabled="!canEdit">
                    <img src="@/assets/images/add-circle.svg" alt="Neue Version hinzufügen" class="w-6 h-6 mr-1" />
                    Neue Version
                  </NButton>
                </template>
                {{ canEdit ? 'Neue Version hinzufügen' : 'Als Reviewer haben Sie keine Berechtigung neue Version hinzuzufügen' }}
              </NTooltip>
            </div>
            <div v-if="!p.versions"><n-space><n-spin size="medium" /></n-space></div>
            <div v-else-if="p.versions.length" class="version-list">
              <div v-for="v in p.versions" :key="p.title + '@' + v.version + '@' + (v.branch || '')" class="version-item-flex-wrapper">
                <router-link class="version-item flex-grow flex items-center justify-between pr-3"
                  :to="{ name: 'versionDetails', params: { projectId: p.projectId, packageName: p.title, version: v.version, workspace: v.branch } }">
                  <div>
                    <div class="version-title">FHIR Package Version: {{ v.version }}</div>
                    <div class="version-date">Letzte Änderung: {{ fmtDate(v.lastModified) }}</div>
                  </div>
                  <NTooltip v-if="v.mrStatus === 'Released Edit'" trigger="hover">
                    <template #trigger>
                      <span :class="['badge', badgeClass('in Review')]"><strong>in Review</strong></span>
                    </template>
                    Diese Version ist bereits veröffentlicht und hat aktuell Änderungen im Review.
                  </NTooltip>
                  <span v-else :class="['badge', badgeClass(v.mrStatus ?? '')]"><strong>{{ v.mrStatus }}</strong></span>
                </router-link>

                <NTooltip v-if="v.mrStatus !== 'Final'" trigger="hover">
                  <template #trigger>
                    <button :disabled="!canEdit" :class="['flex-shrink-0 p-2 rounded-full transition-colors', canEdit ? 'text-red-600 hover:bg-gray-100 hover:cursor-pointer' : 'text-gray-400 cursor-not-allowed']"
                      @click.stop="canEdit && onDeleteVersion(p.projectId, v.version, v.branch!)">
                      <img src="@/assets/images/trash-bin.svg" alt="Löschen" class="w-6 h-6" />
                    </button>
                  </template>
                  {{ canEdit ? 'Diese Version löschen' : 'Als Reviewer haben Sie keine Berechtigung zum Löschen' }}
                </NTooltip>

                <!-- View-Button mit eigenem Tooltip -->
                <NTooltip v-else trigger="hover">
                  <template #trigger>
                    <router-link
                      :to="{ name: 'versionDetails', params: { projectId: p.projectId, packageName: p.title, version: v.version, workspace: v.branch } }"
                      class="flex-shrink-0 p-2 text-gray-400 rounded-full transition-colors">
                      <img src="@/assets/images/view.svg" alt="View" class="w-6 h-6" />
                    </router-link>
                  </template>
                  Diese Version ansehen
                </NTooltip>
              </div>
            </div>
            <p v-else class="text-muted">Keine Versionen gefunden.</p>
          </div>
        </transition>

      </div>
    </div>

    <p v-else-if="!loading" class="text-muted">Keine Projekte gefunden.</p>
  </main>
  </template>
</template>

<style scoped>
.version-item-flex-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;

}
</style>