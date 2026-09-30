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

<template>
  <div v-if="!isLoggedIn" class="text-center py-10">
    <NAlert type="info">
      Bitte melden Sie sich an, um Templates zu bearbeiten.
    </NAlert>
  </div>
  <template v-else>
    <div class="template-form-page container mx-auto px-4 space-y-6">
      <NSpace horizontal :align="'center'" :wrap="false" justify="space-between">
        <NButton size="small" @click="router.push({ name: 'projects' })" type="tertiary" secondary>
          ← {{ ['create', 'createFrom'].includes(mode) ? "Zurück zur Übersicht" : "Zurück" }}
        </NButton>
        <NTooltip v-if="mode === 'edit' && isVersionReleased" trigger="hover">
          <template #trigger>
            <NButton size="small" @click="navigateToAlternateVersion" type="tertiary" id="switch-final-version-btn">
              <span v-if="selectedBranch === defaultBranch?.branch">Zur bearbeiteten Version wechseln</span>
              <span v-else>Zur veröffentlichten Version wechseln</span>
            </NButton>
          </template>
          <span v-if="selectedBranch === defaultBranch?.branch">
            Diese Version hat offene Änderungen. Klicken Sie hier, um die geänderte Version anzusehen.
          </span>
          <span v-else>
            Diese Version wurde bereits veröffentlicht. Klicken Sie hier, um die unbearbeiteten Daten der veröffentlichten Version anzusehen.
          </span>
        </NTooltip>
      </NSpace>

      <NSpace v-if="['create', 'createFrom'].includes(mode)" class="text-sm text-gray-500" id="previous-version-section"
        horizontal :align="'center'" :wrap="false">
        <label for="previous-version" class="font-medium">
          Daten aus vorheriger Version laden:
        </label>
        <NSelect v-model:value="previousVersionSelected" :input-props="{
          'id': 'previous-version', 'size': Math.max(
            loadVersionPlaceholder.length,
            previousVersionsOptions[0]?.maxLabelLength || 5)
        }" :loading="previousVersionState === 'loading'"
          :disabled="['error', 'loading', 'noVersions'].includes(previousVersionState)"
          :options="previousVersionsOptions" :placeholder="loadVersionPlaceholder" :fallback-option="false"
          :consistent-menu-width="true" placement="bottom-end" menu-size="medium" size="medium" filterable
          show-checkmark />

        <!-- Button to go to create form with selected version as base -->
        <NButton size="small" type="primary" :hidden="['loading', 'error', 'noVersions'].includes(previousVersionState)"
          :disabled="previousVersionState !== 'loaded' || previousVersionSelected === null || (mode === 'createFrom' && version === previousVersionSelected)"
          @click="navigateToCreateFrom" icon-placement="right" id="load-previous-version-btn">
          {{
            (mode === 'createFrom' && version === previousVersionSelected)
              ? "Daten geladen"
              : "Lade Daten"
          }}
        </NButton>

        <!-- Button to go to create form without base version -->
        <NButton size="small" type="tertiary" :hidden="mode !== 'createFrom'" :disabled="mode !== 'createFrom'"
          @click="navigateToCreate" id="reset-previous-version-btn">
          Zurücksetzen
        </NButton>
      </NSpace>
      <div v-if="
        mode === 'createFrom' &&
        previousVersionWarnings &&
        previousVersionWarnings.warnings.length
      " class="mt-2" id="previous-version-warnings">
        <NAlert type="warning" :title="`Hinweise zu den Daten aus Version ${previousVersionWarnings.version}`" show-icon
          closable @close="previousVersionWarnings.warnings.splice(0)">
          <div class="text-sm mb-2">
            Beim Laden der Daten sind folgende Warnungen aufgetreten:
          </div>
          <ul class="list-disc ml-6 text-sm">
            <li v-for="(w, i) in previousVersionWarnings.warnings" :key="i">{{ w }}</li>
          </ul>
        </NAlert>
      </div>

      <div class="mt-2">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 class="text-2xl font-semibold text-slate-900">
            {{
              ['create', 'createFrom'].includes(mode)
                ? `Neue Template-Version für ${packageName} erstellen`
                : `${packageName}`
            }}
            <span v-if="mode === 'edit'" class="text-gray-500">
              @ {{ version }}
            </span>
            <span v-else-if="mode === 'createFrom'" class="text-gray-500">
              Kopie von Basis: {{ version }}
            </span>
          </h1>
        </div>

        <div class="text-sm text-gray-500">Repository: #{{ projectId }}</div>
      </div>

      <div v-if="isReleasedVersionEditMode" id="released-terminology-warning">
        <NAlert 
          type="warning" 
          show-icon
        >
          <template #header>
            <NSpace :vertical="false" align="center" >
              <NSpace vertical>
                <span>Diese Version wurde bereits veröffentlicht: Nur Webcontent und Downloadbedingungen können bearbeitet werden.</span>
                <span v-if="canEdit" class="text-sm font-normal">
                  Möchten Sie Änderungen an anderen Bereichen vornehmen, erstellen Sie bitte eine neue Version dieser Terminologie.
                </span>
              </NSpace>
              <NTooltip v-if="canCreateFromCurrentVersion" trigger="hover">
                <template #trigger>
                  <NButton size="small" type="primary" ghost round
                  @click="navigateToCreateFromCurrentVersion"
                    id="create-from-current-version-btn">
                    Neue Version erstellen
                  </NButton>
                </template>
                Erstellen Sie eine neue Version basierend auf der aktuell geladenen Version ({{ version }}). <br/>
                Alle Daten werden übernommen und können in der neuen Version angepasst werden.
              </NTooltip>
            </NSpace>
          </template>
        </NAlert>
      </div>

      <div v-if="statusMessage.message" class="mt-4">
        <NAlert :type="statusMessage.type || 'info'" :title="statusMessage.title || (statusMessage.type === 'error' ? 'Fehler' : 'Hinweis')"
          show-icon closable @close="statusMessage.message = null; statusMessage.title = null; statusMessage.debug = null">
          <div>{{ statusMessage.message }}</div>
          <div v-if="statusMessage.debug" class="mt-1 text-xs text-gray-500">{{ statusMessage.debug }}</div>
        </NAlert>
      </div>

      <div v-if="['edit', 'createFrom'].includes(mode) && loadingDetails" class="flex items-center gap-3 text-gray-500">
        <NSpin />
        <span>Lade Details…</span>
      </div>

      <div v-if="['create', 'createFrom'].includes(mode) || (mode === 'edit' && hasDetails)" class="space-y-4 ">

        <div class="sticky-header">
            <div class="flex items-center justify-between">
              <NTabs v-model:value="tab" type="line" size="large">
                 <NTabPane
                  v-for="t in templateTabs"
                  :key="t.name"
                  :name="t.name"
                  :title="t.title"
                >
                  <template #tab>
                     <span :class="isReleasedVersionEditMode && !t.isReleasedEditable ? 'text-slate-400' : ''">{{ t.name }}</span>
                  </template>
                </NTabPane>
              </NTabs>

              <!-- ACTION BUTTONS -->
              <div class="flex items-center gap-2">
                <NTooltip v-if="mode === 'edit' && hasMr" trigger="hover">
                  <template #trigger>
                    <NButton type="warning" :disabled="merging || saving || !canApprove" :loading="merging"
                      @click="mergeMr">
                      Genehmigen
                    </NButton>
                  </template>
                  {{ canApprove ? 'Genehmigen' : 'Nur Reviewer dürfen Templates genehmigen.' }}
                </NTooltip>

                <NTooltip v-if="['create', 'createFrom'].includes(mode) || (mode === 'edit' && hasDetails)"
                  trigger="hover">
                  <template #trigger>
                    <NButton :disabled="!canEdit || !isFormValid || (['edit', 'createFrom'].includes(mode) && !hasUiChanges && !canStartReviewWithoutChanges)"
                      :type="(['create', 'createFrom'].includes(mode)) ? 'success' : 'primary'" attr-type="submit"
                      @click="saveVersion" :loading="saving">
                      {{ ['create', 'createFrom'].includes(mode) ? "Neue Version erstellen" : "Speichern" }}
                    </NButton>
                  </template>
                  {{ canEdit ? 'Publisher dürfen Templates bearbeiten.' : 'Als Reviewer dürfen Sie die Templates nicht bearbeiten..' }}
                </NTooltip>
              </div>
            </div>
          </div>

        <NCard ref="containerRef" class="content-card">
          <div class="content-area">
            <!-- PACKAGE TAB -->
            <div v-show="tab === 'FHIR-Templates'" class="space-y-6">
              <PackageForm
                v-model:model-value="pkgJsonString"
                @update:version="pkgJson.version = $event"
                @update:packageName="pkgJson.packagename = $event"
                :read-only-fields="mode === 'edit' ? ['packagename', 'version'] : ['packagename']"
                :disabled="!canEdit || (isReleasedVersionEditMode && !fhirTemplatesTab.isReleasedEditable)"
                @valid="validation.pkgValid = $event"
                :package-name="pkgJson.packagename || packageName"
                :version="pkgJson.version"
                :comments="commentItems"
                :can-write-comments="canWriteCommentsFhirTemplates"
                :add-comment="addComment"
                :reply-to-thread="comments.reply"
              />
              <!-- TODO: Should this be shown when creating FROM a version? -->
              <NCollapse v-if="['edit', 'createFrom'].includes(mode) && templateJsonStates.length > 0" class="mt-4">
                <NCollapseItem v-for="template in templateJsonStates" :key="template.name" :name="template.name">
                  <template #header>
                    <div class="flex items-center justify-between w-full">
                      <strong class="text-slate-800">{{ template.name }}</strong>
                      <span v-if="template.jsonValid === false"
                        class="text-xs bg-red-600 text-white rounded px-2 py-0.5">
                        ungültig
                      </span>
                    </div>
                  </template>

                  <div class="space-y-3 py-3">
                    <ResourceTemplateForm 
                      v-model="template.json"
                      :template-name="template.name"
                      :disabled="!canEdit || (isReleasedVersionEditMode && !fhirTemplatesTab.isReleasedEditable)"
                      @valid="(valid) => (template.jsonValid = valid)" 
                      :comments="commentItems"
                      :can-write-comments="canWriteCommentsFhirTemplates" 
                      :add-comment="addComment"
                      :reply-to-thread="comments.reply" />
                  </div>
                </NCollapseItem>
              </NCollapse>
            </div>

            <!-- WEBSITE TAB -->
            <div v-show="tab === 'Webcontent'" class="space-y-4">
              <WebsiteForm 
                :meta-json="metaJsonString" 
                :changelogs-json="changelogsJsonString" 
                :markdown="markdown"
                :template-states="templateMarkdownStates" 
                :can-edit="!!canEdit && !(isReleasedVersionEditMode && !webcontentTab.isReleasedEditable)"
                :mode="mode" :package-name="packageName"
                :package-version="pkgJson.version" 
                :comments="commentItems" 
                :can-write-comments="canWriteCommentsWebcontent"
                :add-comment="addComment" 
                :reply-to-thread="comments.reply" 
                @update:meta-json="metaJsonString = $event"
                @update:changelogs-json="changelogsJsonString = $event" 
                @update:markdown="onMarkdownUpdate"
                @update:template-markdown="onTemplateMarkdownUpdate"
                @template-markdown-valid="validation.templateMarkdownValid = $event"
                @remove-template-markdown="onRemoveTemplateMarkdown"
                @add-template-markdown="addMarkdownTemplate" />
            </div>

            <!-- Downloadbedingungen Tab -->
            <div v-show="tab === 'Downloadbedingungen'" class="space-y-4">
              <NAlert type="info" show-icon>
                In diesem Bereich können die Downloadbedingungen für die FHIR-Packages festgelegt werden.
                Bitte beachte, dass diese Bedingungen von den Nutzern akzeptiert werden müssen, bevor sie die
                FHIR-Packages
                herunterladen können.
              </NAlert>
              <DownloadConditionsEditor 
                :can-edit="!!canEdit && !(isReleasedVersionEditMode && !downloadConditionsTab.isReleasedEditable)" 
                :disabled="!canEdit || (isReleasedVersionEditMode && !downloadConditionsTab.isReleasedEditable)"
                :comments="commentItems" 
                :can-write-comments="canWriteCommentsDownloadConditions" 
                :add-comment="addComment"
                :reply-to-thread="comments.reply" 
                :conditions-value="downloadConditions"
                @update:conditions-value="onDownloadConditionsUpdate" />
            </div>

            <!-- File Upload Tab -->
            <div v-show="tab === 'Upload Inputdateien'" class="space-y-4">
              <FileUploader 
                ref="fileUploaderRef" 
                :disabled="!canEdit || (isReleasedVersionEditMode && !uploadInputFilesTab.isReleasedEditable) || !pkgJson.version"
                :repository-id="String(projectId)" 
                :branch="selectedBranch || ''" 
                :package-name="packageName"
                :version="currentVersion" 
                :create-merge-request="!hasMr" 
                :input-files="inputFiles"
                @update:input-files="$emit('update:input-files', $event)"
                @upload-success="onUploadSuccess" 
                @update:status-message="onStatusMessageUpdate" />
            </div>
          </div>
        </NCard>
      </div>

    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRef, unref, watch } from "vue";
import {
  NButton,
  NSpace,
  NSelect,
  NSpin,
  NAlert,
  useDialog,
  NCard,
  NTabs,
  NTabPane,
  NCollapse,
  NCollapseItem,
  NTooltip
} from "naive-ui";

import { useTemplatesManagement } from "../composables/useTemplatesManagement";
import { usePackage } from "../composables/usePackageData";
import { useStatusMessage } from "../composables/useStatusMessage";
import { useComments } from "../composables/useComments";

import { approveAndMergeReview } from "../api/workspaces";

import PackageForm from "../components/PackageForm.vue";
import WebsiteForm from "../components/WebsiteForm.vue";
import DownloadConditionsEditor from "../components/DownloadConditionsEditor.vue";
import FileUploader from "../components/FileUploader.vue";
import ResourceTemplateForm from "../components/ResourceTemplateForm.vue";

import { dispatchReviewApproved } from "../utils/events";
import { toErrorStatusMessage, toSuccessStatusMessage } from '../utils/apiErrorPresentation';
import type { MarkdownContent, CommitChange, CommentItem, StatusMessageState } from "../types";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";

const props = withDefaults(
  defineProps<{
    mode: "create" | "createFrom" | "edit";
  }>(),
  { mode: "edit" }
);
const modeRef = toRef(props, "mode");

const {
  mode: currentMode,
  router,
  projectId,
  packageName,
  version,
  defaultBranch,

  previousVersions,
  previousVersionSelected,
  previousVersionState,
  previousVersionWarnings,
  loadingDetails,
  saving,
  statusMessage,
  canEdit,
  isLoggedIn,
  canApprove,
  selectedBranch,
  startReviewWithoutCommit,
  performSave,
  tab,
  hasDetails,
  loadedPackageData,
  workspaceDetails,
  isVersionReleased,
  templateMarkdownStates,
  templateJsonStates,
  addMarkdownTemplate,
  removeMarkdownTemplate,
  limitMd,
} = useTemplatesManagement(modeRef);

const getDataFn = () => loadedPackageData.value;

const { pkgJson, metaJson, changelogsJson, markdown, downloadConditions, inputFiles, buildCommitChanges } = usePackage(
  getDataFn,
  packageName.value,
  version.value
);

function onDownloadConditionsUpdate(content: string) {
  downloadConditions.value = content;
}

const onStatusMessageUpdate = (newStatus: StatusMessageState) => {
  statusMessage.value = newStatus;
};

const onUploadSuccess = (files: string[]) => {
  const newFiles = files.map(fileName => ({
    name: fileName,
    lastModified: new Date().toISOString()
  }));
  inputFiles.value = [...inputFiles.value, ...newFiles];
};

const mode = currentMode;

const validation = reactive({
  pkgValid: modeRef.value !== "create",
  templateMarkdownValid: true,
});

const templateJsonValid = computed(() =>
  templateJsonStates.value.every((template) => template.jsonValid !== false)
);

const isFormValid = computed(() =>
  validation.pkgValid && templateJsonValid.value
);

type TemplateTab = {
  name: string;
  title: string;
  isReleasedEditable: boolean;
};

const fhirTemplatesTab: TemplateTab = { 
  name: "FHIR-Templates", 
  title: "Package", 
  isReleasedEditable: false 
};
const webcontentTab: TemplateTab = { 
  name: "Webcontent", 
  title: "Website", 
  isReleasedEditable: true 
};
const downloadConditionsTab: TemplateTab = { 
  name: "Downloadbedingungen", 
  title: "Downloadbedingungen", 
  isReleasedEditable: true 
};
const uploadInputFilesTab: TemplateTab = { 
  name: "Upload Inputdateien", 
  title: "Upload Inputdateien", 
  isReleasedEditable: false 
};

const templateTabs = [fhirTemplatesTab, webcontentTab, downloadConditionsTab, uploadInputFilesTab];

const isReleasedVersionEditMode = computed(() => {
  return (
    modeRef.value === "edit" &&
    !!isVersionReleased?.value
  );
});

const canCreateFromCurrentVersion = computed(() => {
  return modeRef.value === "edit" && !!isVersionReleased?.value && canEdit.value && !!version.value;
});

const previousVersionsOptions = computed(() => {
  // TODO: Maybe use groups here? https://www.naiveui.com/en-US/os-theme/components/select#group.vue
  const maxLabelLength = previousVersions.value.reduce((max, v) => Math.max(max, v.version.length), 0);
  return previousVersions.value.map((v) => ({
    label: v.version,
    value: v.version,
    maxLabelLength: maxLabelLength,
  }));
});

watch(
  modeRef,
  (m) => {
    validation.pkgValid = m !== "create";
  },
  { immediate: true }
);


const pkgJsonString = computed({
  get: () => JSON.stringify(pkgJson.value, null, 2),
  set(value: string) {
    try {
      const parsed = JSON.parse(value || "{}");

      Object.assign(pkgJson.value, {
        title: parsed.title ?? "",
        description: parsed.description ?? "",
        author: parsed.author ?? "",
        dependencies: parsed.dependencies ?? "",
        altTitle: parsed.altTitle ?? "",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        copyright: parsed.copyright ?? "",
      });
    } catch (err) {
      console.error("Error parsing package JSON:", err);
    }
  },
});

const metaJsonString = computed({
  get: () => JSON.stringify(metaJson.value, null, 2),
  set(value: string) {
    try {
      Object.assign(metaJson.value, JSON.parse(value));
    } catch (err) {
      console.error("Error parsing metadata JSON:", err);
    }
  },
});

const changelogsJsonString = computed({
  get: () => JSON.stringify(changelogsJson.value, null, 2),
  set(value: string) {
    try {
      Object.assign(changelogsJson.value, JSON.parse(value));
    } catch (err) {
      console.error("Error parsing changelogs JSON:", err);
    }
  },
});

const onMarkdownUpdate = (content: Partial<MarkdownContent>) => {
  for (const [key, value] of Object.entries(content)) {
    markdown.value[key as keyof MarkdownContent] = limitMd(key, (value as string) ?? "");
  }
};


type TemplateMarkdownPayload = {
  index: number;
  version: string;
  canonicalUrl: string;
  value: string;
};

const onTemplateMarkdownUpdate = ({
  index,
  version,
  canonicalUrl,
  value,
}: TemplateMarkdownPayload) => {
  const tmpl = templateMarkdownStates.value[index];
  if (!tmpl) return;

  tmpl.version = version;
  tmpl.canonicalUrl = canonicalUrl;
  tmpl.markdown = limitMd(`tmpl-${version}-${canonicalUrl || index}`, value);
};

const onRemoveTemplateMarkdown = (index: number) => {
  removeMarkdownTemplate(index);
};

function normalizeJsonString(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value || "{}"), null, 2);
  } catch {
    return value || "";
  }
}

const buildTemplateJsonCommitChanges = (): CommitChange[] => {
  const currentTemplates = templateJsonStates.value;

  if (["create", "createFrom"].includes(modeRef.value)) {
    const changes: CommitChange[] = [];

    for (const template of currentTemplates) {
      const fileName = (template.name ?? "").trim();
      const content = normalizeJsonString(template.json ?? "{}");

      if (!fileName || content.trim() === "{}") continue;

      changes.push({
        action: "create",
        type: "template",
        fileName,
        content,
        encoding: "text",
      });
    }

    return changes;
  }

  const details = workspaceDetails.value;
  const oldTemplates = details?.templatesJson ?? [];

  const oldByName = new Map<string, any>();

  for (const oldTemplate of oldTemplates) {
    const fileName = (oldTemplate.name ?? "").trim();
    if (fileName) oldByName.set(fileName, oldTemplate);
  }

  const changes: CommitChange[] = [];

  for (const template of currentTemplates) {
    const fileName = (template.name ?? "").trim();
    const content = normalizeJsonString(template.json ?? "{}");

    if (!fileName) continue;

    const oldTemplate = oldByName.get(fileName);

    if (!oldTemplate) {
      if (content.trim() !== "{}") {
        changes.push({
          action: "create",
          type: "template",
          fileName,
          content,
          encoding: "text",
        });
      }

      continue;
    }

    const oldContent = normalizeJsonString(
      typeof oldTemplate.json === "string"
        ? oldTemplate.json
        : JSON.stringify(oldTemplate.json ?? {}, null, 2)
    );

    if (oldContent !== content) {
      changes.push({
        action: "update",
        type: "template",
        fileName,
        content,
        encoding: "text",
      });
    }
  }

  return changes;
};

const buildTemplateMarkdownCommitChanges = (): CommitChange[] => {
  const newMd = templateMarkdownStates.value;

  if (["create", "createFrom"].includes(modeRef.value)) {
    return newMd
      .map((tmpl) => {
        const fileName = buildKey(tmpl.version, tmpl.canonicalUrl);
        const content = tmpl.markdown ?? "";

        if (!fileName || content.trim().length === 0) return null;

        return {
          action: "create" as const,
          type: "template_markdown" as const,
          fileName,
          content,
          encoding: "text" as const,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  const changes: CommitChange[] = [];

  const details = workspaceDetails.value;
  const oldMd = details?.templatesMd ?? [];

  const oldByKey = new Map<string, any>();
  for (const m of oldMd) {
    const key = buildKey((m as any).version ?? "", (m as any).canonicalUrl ?? "");
    if (!key) continue;
    oldByKey.set(key, m);
  }

  const usedOldKeys = new Set<string>();

  for (const tmpl of newMd) {
    const newKey = buildKey(tmpl.version, tmpl.canonicalUrl);
    if (!newKey) continue;

    const originalKey = buildKey(
      tmpl.originalVersion ?? "",
      tmpl.originalCanonicalUrl ?? ""
    );
    const newContent = tmpl.markdown ?? "";

    const oldByOriginal = originalKey ? oldByKey.get(originalKey) : undefined;
    const oldByCurrent = oldByKey.get(newKey);

    if (!oldByOriginal && !oldByCurrent) {
      if (newContent.trim().length === 0) continue;
      changes.push({
        action: "create",
        type: "template_markdown",
        fileName: newKey,
        content: newContent,
        encoding: "text",
      });
      continue;
    }

    if (oldByOriginal && originalKey && originalKey !== newKey) {
      changes.push({
        action: "delete",
        type: "template_markdown",
        fileName: originalKey,
        encoding: "text",
      });

      if (newContent.trim().length > 0) {
        changes.push({
          action: "create",
          type: "template_markdown",
          fileName: newKey,
          content: newContent,
          encoding: "text",
        });
      }

      usedOldKeys.add(originalKey);
      continue;
    }

    const oldEntry = oldByOriginal || oldByCurrent;
    if (!oldEntry) continue;

    const usedKey = buildKey(
      (oldEntry as any).version ?? "",
      (oldEntry as any).canonicalUrl ?? ""
    );
    if (usedKey) usedOldKeys.add(usedKey);

    const oldContent = oldEntry.markdown ?? "";
    if (oldContent !== newContent) {
      if (newContent.trim().length > 0) {
        changes.push({
          action: "update",
          type: "template_markdown",
          fileName: newKey,
          content: newContent,
          encoding: "text",
        });
      } else {
        changes.push({
          action: "delete",
          type: "template_markdown",
          fileName: newKey,
          encoding: "text",
        });
      }
    }
  }

  for (const old of oldMd) {
    const oldKey = buildKey((old as any).version ?? "", (old as any).canonicalUrl ?? "");
    if (!oldKey) continue;
    if (usedOldKeys.has(oldKey)) continue;

    const stillExists = newMd.some((t) => {
      const k1 = buildKey(t.version, t.canonicalUrl);
      const k2 = buildKey(t.originalVersion ?? "", t.originalCanonicalUrl ?? "");
      return k1 === oldKey || k2 === oldKey;
    });

    if (!stillExists) {
      changes.push({
        action: "delete",
        type: "template_markdown",
        fileName: oldKey,
        encoding: "text",
      });
    }
  }

  return changes;
};

function buildKey(version: string, canonicalUrl: string) {
  const v = (version ?? "").trim();
  const c = (canonicalUrl ?? "").trim();
  if (!v || !c) return "";
  return `${v};${c}`;
}

const dialog = useDialog();

const hasMr = computed(() => !!workspaceDetails.value?.mergeRequest?.id);
const mrId = computed(() => workspaceDetails.value?.mergeRequest?.id ?? null);

const canWriteComments = computed(() => modeRef.value === "edit" && !!mrId.value);
const canWriteCommentsFhirTemplates = computed(() => {
  return canWriteComments.value && (!isReleasedVersionEditMode.value || fhirTemplatesTab.isReleasedEditable);
});
const canWriteCommentsWebcontent = computed(() => {
  return canWriteComments.value && (!isReleasedVersionEditMode.value || webcontentTab.isReleasedEditable);
});
const canWriteCommentsDownloadConditions = computed(() => {
  return canWriteComments.value && (!isReleasedVersionEditMode.value || downloadConditionsTab.isReleasedEditable);
});
const canStartReviewWithoutChanges = computed(() => {
  return modeRef.value === "edit" && !hasMr.value && canEdit.value && isFormValid.value && !hasUiChanges.value;
});

const pendingChanges = computed<CommitChange[]>(() => {
  const action: "create" | "update" = ["create", "createFrom"].includes(modeRef.value) ? "create" : "update";
  const packageChanges = buildCommitChanges(action);
  const templateJsonChanges = buildTemplateJsonCommitChanges();
  const templateMarkdownChanges = buildTemplateMarkdownCommitChanges();
  return [...packageChanges, ...templateJsonChanges, ...templateMarkdownChanges];
});

const initialUiSignature = ref<string | null>(null);
const initialUiMode = ref<"create" | "createFrom" | "edit" | null>(null);

watch(
  [modeRef, loadingDetails, version, selectedBranch],
  () => {
    if (!["create", "createFrom"].includes(modeRef.value)) {
      initialUiSignature.value = null;
      initialUiMode.value = null;
      return;
    }

    if (initialUiMode.value !== modeRef.value) {
      initialUiSignature.value = null;
      initialUiMode.value = modeRef.value;
      return;
    }
    if (modeRef.value === "create") {
      initialUiSignature.value = JSON.stringify(pendingChanges.value);
      return;
    }

    if (modeRef.value === "createFrom" && loadingDetails.value) {
      initialUiSignature.value = null;
      return;
    }

    if (initialUiSignature.value === null) {
      initialUiSignature.value = JSON.stringify(pendingChanges.value);
    }
  },
  { immediate: true }
);

const hasUiChanges = computed(() => {
  if (["create", "createFrom"].includes(modeRef.value)) {
    if (!initialUiSignature.value) return false;
    return JSON.stringify(pendingChanges.value) !== initialUiSignature.value;
  }

  // In edit mode, only evaluate dirty state when backend data has fully loaded.
  if (modeRef.value === "edit" && (!hasDetails.value || loadingDetails.value || !loadedPackageData.value)) {
    return false;
  }

  return pendingChanges.value.length > 0;
});

const saveVersion = async () => {
  if (!isFormValid.value || !canEdit.value || saving.value) return;

  const allChanges = pendingChanges.value;

  const currentPkgVersion = pkgJson.value.version;

  const noChanges = !hasUiChanges.value;

  // Open 'cancel or review' diaglog if no changes exist and we are not editing a released version.
  if (noChanges) {
    if ((modeRef.value !== "edit" || hasMr.value)) return;

    const decision = await new Promise<"mr" | "cancel">((resolve) => {
      dialog.warning({
        title: "Review starten?",
        content:
          "Die Version wurde nicht verändert. Soll trotzdem ein Review gestartet werden?",
        positiveText: "Ja, Review starten",
        negativeText: "Abbrechen",

        closeOnEsc: true,
        maskClosable: true,

        onPositiveClick: () => resolve("mr"),
        onNegativeClick: () => resolve("cancel"),
        onClose: () => resolve("cancel"),
      });
    });

    if (decision === "cancel") return;

    await startReviewWithoutCommit(currentPkgVersion);
    return;
  }

  // Open 'save or review' dialog if no MR exists yet and we are not editing a released version.
  if (!hasMr.value && isReleasedVersionEditMode.value) {
    await performSave(allChanges, currentPkgVersion, true);
    return;
  }
  if (!hasMr.value) {
    const decision = await new Promise<"mr" | "no-mr" | "cancel">((resolve) => {
      dialog.warning({
        title: "Review starten?",
        content:
          "Für diese Änderungen wurde noch kein Review gestartet. Soll beim Speichern ein Review gestartet werden?",
        positiveText: "Ja, Review starten",
        negativeText: "Nein, nur Speichern",

        closeOnEsc: true,
        maskClosable: true,

        onPositiveClick: () => resolve("mr"),
        onNegativeClick: () => resolve("no-mr"),
        onClose: () => resolve("cancel"),
      });
    });

    if (decision === "cancel") return;

    const createMr = decision === "mr";
    await performSave(allChanges, currentPkgVersion, createMr);
    return;
  }

  await performSave(allChanges, currentPkgVersion, false);
};

const merging = ref(false);

function isHttp500(err: any): boolean {
  const status = (err && (err.status || (err.response && err.response.status))) || null;
  if (status === 500) return true;

  const msg = String((err && (err.message || err)) || "");
  return msg.includes("500");
}

const mergeMr = async () => {
  if (mode.value !== "edit" || !hasMr.value) return;

  if (merging.value || saving.value) return;

  const decision = await new Promise<"merge" | "cancel">((resolve) => {
    dialog.warning({
      title: "Änderungen genehmigen?",
      content: "Sollen die änderungen genehmigt werden?",
      positiveText: "Ja, genehmigen",
      negativeText: "Abbrechen",

      closeOnEsc: true,
      maskClosable: true,

      onPositiveClick: () => resolve("merge"),
      onNegativeClick: () => resolve("cancel"),
      onClose: () => resolve("cancel"),
    });
  });

  if (decision !== "merge") return;

  merging.value = true;
  statusMessage.value = { type: null, title: null, message: null, debug: null };

  try {
    const pid = String(unref(projectId));
    const mid = String(mrId.value);

    await approveAndMergeReview({ projectId: pid, mrId: mid });
    const approvedDetail = {
      projectId: Number(pid),
      mrId: Number(mid),
    };
    dispatchReviewApproved(approvedDetail);

    statusMessage.value = toSuccessStatusMessage('Die Änderungen wurden übernommen.');

    await router.push("/projects");
  } catch (e: any) {
    const msg500 =
      "Dir fehlen die notwendigen GitLab-Rechte, um diese Änderungen zu genehmigen.";

    const msgGeneric =
      (e && (e.data?.message || e.response?.data?.message || e.message)) ||
      "Änderungen konnten nicht übernommen werden.";

    const is500 = isHttp500(e);

    const finalMsg = is500 ? msg500 : msgGeneric;

    statusMessage.value = is500
      ? toErrorStatusMessage({ status: 500, message: finalMsg, code: 'MERGE_FAILED' }, finalMsg)
      : toErrorStatusMessage(e, finalMsg);

    dialog.error({
      title: "Änderungen konnten nicht übernommen werden.",
      content: finalMsg,
      positiveText: "OK",
    });
  } finally {
    merging.value = false;
  }
};

const comments = useComments({
  repositoryId: computed(() => String(unref(projectId))),
  branch: selectedBranch,
  version,
  mrId,
  canWrite: canWriteComments,
});

const addComment = comments.addComment;

const commentItems = computed<CommentItem[]>(() => {
  const v = comments.items?.value;
  return Array.isArray(v) ? v : [];
});

useStatusMessage(statusMessage);

const loadVersionPlaceholder = computed(() => {
  if (previousVersionState.value === "loading") return "Lade Versionen...";
  if (previousVersionState.value === "error") return "Fehler beim Laden";
  if (previousVersionState.value === "noVersions") return "Keine Versionen gefunden";
  return "Version auswählen";
});

const navigateToCreateFrom = async () => {
  if (!previousVersionSelected.value) return;

  await router.push({
    name: "newVersionFrom",
    params: {
      projectId: projectId.value,
      packageName: packageName.value,
      version: previousVersionSelected.value,
      workspace: defaultBranch.value?.branch,
    },
  });
};

const navigateToCreate = async () => {
  await router.push({
    name: "newVersion",
    params: {
      projectId: projectId.value,
      packageName: packageName.value,
    },
    state: { mode: "create" },
  });
  previousVersionSelected.value = null;
};

const navigateToCreateFromCurrentVersion = async () => {
  previousVersionSelected.value = version.value;
  navigateToCreateFrom();
};

const hasUnsavedPublisherChanges = () => {
  // Skip for logged-out users
  if (!isLoggedIn.value) return false;
  // During save-triggered navigation, skip prompt.
  if (saving.value) return false;
  return canEdit.value && hasUiChanges.value;
};

const confirmDiscardChanges = () => {
  if (!hasUnsavedPublisherChanges()) return true;
  return globalThis.confirm("Ungespeicherte Änderungen gehen beim Verlassen verloren. Möchten Sie trotzdem fortfahren?");
};

onBeforeRouteUpdate((to, from, next) => {
  // Check if navigating to a different version, if the path is the same, no need to check for unsaved changes
  if (to.fullPath === from.fullPath) {
    next();
    return;
  }
  if (confirmDiscardChanges()) {
    next();
  } else {
    next(false);
  }
});

onBeforeRouteLeave((_to, _from, next) => {
  // Check if navigating away from the page
  if (confirmDiscardChanges()) {
    next();
  } else {
    next(false);
  }
});

const navigateToAlternateVersion = async () => {
  if (!version.value || !defaultBranch.value) return;

  const isOnDefaultBranch = selectedBranch.value === defaultBranch.value.branch;

  if (isOnDefaultBranch) {
    if (!isVersionReleased.value) return;

    const featureBranch = "feature/" + version.value;
    if (!featureBranch) return;

    await router.push({
      name: "versionDetails",
      params: {
        projectId: projectId.value,
        packageName: packageName.value,
        version: version.value,
        workspace: featureBranch,
      },
    });
  } else {
    await router.push({
      name: "versionDetails",
      params: {
        projectId: projectId.value,
        packageName: packageName.value,
        version: version.value,
        workspace: defaultBranch.value.branch,
      },
    });
  }
};

// Watcher der Versionsänderung
const currentVersion = ref(version.value);

watch(() => pkgJson.value.version, (newVersion) => {
  if (newVersion && newVersion !== currentVersion.value) {
    currentVersion.value = newVersion;
  }
}, { immediate: true });


watch(
  [loadedPackageData, modeRef],
  ([data, currentMode]) => {
    if (currentMode === 'edit' && data) {
      const isEmptyArray = data.pkgJson && Array.isArray(data.pkgJson) && data.pkgJson.length === 0;

      const isEmpty = !data.pkgJson ||
        (typeof data.pkgJson === 'object' && Object.keys(data.pkgJson).length === 0) ||
        isEmptyArray;

      if (isEmpty) {
        router.push({
          name: "newVersion",
          params: {
            projectId: projectId.value,
            packageName: packageName.value,
            packageVersion: data.pkgJson?.version || null,
          }
        });
      }
    }
  },
  { immediate: true, deep: true }
);

</script>

<style scoped>
/* Page/Layout */
.template-form-page {
  min-height: 100%;
}

/* Sticky Header Styling */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Content Card */
.content-card {
  margin-top: 0;
  scroll-margin-top: 80px;
}
</style>