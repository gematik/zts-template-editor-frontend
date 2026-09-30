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
  <div v-if="['edit', 'createFrom'].includes(mode)" class="mt-8 space-y-4">
    <!-- TODO: Should this be shown when creating FROM a version? -->
    <h3 class="text-lg font-semibold text-slate-800">
      Ressourcenbeschreibungen
    </h3>

    <div v-if="!templateStates || templateStates.length === 0" class="text-sm text-gray-400">
      Keine Templates vorhanden.
    </div>

    <div
      v-for="(template, index) in templateStates"
      :key="template.originalCanonicalUrl || index"
      class="space-y-4 pb-6 border-b border-gray-200"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <div class="md:col-span-2 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <span class="block text-sm font-medium text-gray-700">Canonical und Version zuordnung</span>

            <FieldComments
              :file-name="canonicalCommentFileName()"
              :type="('update_index_url_version' as CommentType)"
              :line="1"
              :comments="comments"
              :can-write="canWrite"
              :add-comment="addComment"
              :reply-to-thread="replyToThread"
            />
          </div>

          <!-- Version -->
<div class="space-y-1">
  <label
    :for="`tmpl-version-${index}`"
    class="block text-sm font-medium text-gray-700"
  >
    Version
  </label>
  <input
    :id="`tmpl-version-${index}`"
    type="text"
    :class="[
      'w-full p-3 border rounded-lg disabled:cursor-not-allowed disabled:bg-gray-50',
      templateError(template) ? 'border-red-500' : 'border-gray-300'
    ]"
    :disabled="disabled"
    :value="template.version"
    @input="onVersionChange(index, $event)"
    placeholder="z.B. v1"
    :aria-invalid="!!templateError(template)"
    :aria-describedby="templateError(template) ? `tmpl-version-${index}-error` : undefined"
  />
  <p
    v-if="templateError(template)"
    :id="`tmpl-version-${index}-error`"
    class="text-red-600 text-sm mt-1"
  >
    {{ templateError(template) }}
  </p>
</div>

<!-- Canonical URL -->
<div class="space-y-1">
  <label
    :for="`tmpl-canonical-${index}`"
    class="block text-sm font-medium text-gray-700"
  >
    Canonical URL
  </label>
  <input
    :id="`tmpl-canonical-${index}`"
    type="text"
    class="w-full p-3 border border-gray-300 rounded-lg disabled:cursor-not-allowed disabled:bg-gray-50"
    :disabled="disabled"
    :value="template.canonicalUrl"
    @input="onCanonicalChange(index, $event)"
    placeholder="https://..."
  />
</div>

        </div>

        <div class="flex justify-end">
          <button
            class="text-sm px-3 py-2 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
            :disabled="disabled"
            @click="emit('remove', index)"
            type="button"
          >
            Löschen
          </button>
        </div>
      </div>

      <MarkdownEditorWithPreviewComments
        :id="`tmpl-md-${index}`"
        :label="`Beschreibung (Markdown)`"
        :rows="8"
        :model-value="template.markdown || ''"
        :disabled="disabled"
        :file-name="templateFileName(template)"
        :type="('template_markdown' as CommentType)"
        :comments="comments"
        :can-write="canWrite"
        :add-comment="addComment"
        :reply-to-thread="replyToThread"
        @update:modelValue="(v) => onMarkdownChange(index, v)"
      />
    </div>

    <div class="flex justify-end">
      <button
        class="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
        :disabled="disabled"
        @click="emit('add')"
        type="button"
      >
        Markdown-Template hinzufügen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import FieldComments from "./FieldComments.vue";
import MarkdownEditorWithPreviewComments from "./MarkdownEditorWithPreviewComments.vue";
import type { TemplateMarkdownState, CommentItem, CommentType } from "../types";
import { RX_TEMPLATE_MARKDOWN_VERSION, validateTemplateMarkdownFileName } from "../validation/rules";

const props = defineProps<{
  mode: "create" | "createFrom" | "edit";
  templateStates: TemplateMarkdownState[];
  disabled: boolean;

  comments: CommentItem[];
  canWrite: boolean;

  addComment: (p: { fileName: string; type: CommentType; line: number; body: string }) => Promise<void>;
  replyToThread?: (p: { threadId: string; body: string; resolved: boolean }) => Promise<void>;
}>();

const emit = defineEmits<{
  (e: "update", p: { index: number; version: string; canonicalUrl: string; value: string }): void;
  (e: "remove", index: number): void;
  (e: "add"): void;
  (e: "valid", value: boolean): void;
}>();

const isValid = computed(() =>
  (props.templateStates ?? []).every((template) => !templateError(template))
);

watch(isValid, (valid) => emit("valid", valid), { immediate: true });

function onVersionChange(index: number, event: Event) {
  const target = event.target as HTMLInputElement;
  const v = target.value || "";
  const currentVersion = props.templateStates?.[index]?.version ?? "";

  if (v && !RX_TEMPLATE_MARKDOWN_VERSION.test(v)) {
    target.value = currentVersion;
    return;
  }
  
  const c = props.templateStates?.[index]?.canonicalUrl ?? "";
  emit("update", {
    index,
    version: v,
    canonicalUrl: c,
    value: props.templateStates?.[index]?.markdown ?? "",
  });
}

function onCanonicalChange(index: number, event: Event) {
  const target = event.target as HTMLInputElement;
  const c = target.value || "";
  const v = props.templateStates?.[index]?.version ?? "";
  emit("update", {
    index,
    version: v,
    canonicalUrl: c,
    value: props.templateStates?.[index]?.markdown ?? "",
  });
}

function onMarkdownChange(index: number, value: string) {
  const v = props.templateStates?.[index]?.version ?? "";
  const c = props.templateStates?.[index]?.canonicalUrl ?? "";
  emit("update", {
    index,
    version: v,
    canonicalUrl: c,
    value,
  });
}

function templateError(t: TemplateMarkdownState) {
  return validateTemplateMarkdownFileName(t.version, t.canonicalUrl);
}

function templateFileName(t: TemplateMarkdownState) {
  return `${t.version};${t.canonicalUrl}`
}

function canonicalCommentFileName() {
  return `index.json`;
}
</script>
