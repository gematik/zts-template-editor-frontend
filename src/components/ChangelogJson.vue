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
  <div class="space-y-6">
    <h2 class="text-lg font-semibold">Changelog</h2>

    <div class="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <div class="grid md:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label
            for="packageName_changelogs"
            class="block text-sm font-medium text-gray-600"
            >Package Name</label
          >
          <input
            id="packageName_changelogs"
            type="text"
            v-model="changelog['package-name']"
            disabled
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          />
        </div>

        <div class="space-y-1">
          <label
            for="packageVersion_changelogs"
            class="block text-sm font-medium text-gray-600"
            >Package Version</label
          >
          <input
            id="packageVersion_changelogs"
            type="text"
            v-model="changelog['package-version']"
            disabled
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          />
        </div>
      </div>

      <div class="space-y-3">
        <span class="block text-sm font-medium text-gray-600">Changes</span>

        <div v-for="(change, index) in changelog.changes" :key="index" class="space-y-1">
          <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
            <div class="flex gap-2 items-start">
              <label :for="'change-type-' + index" class="sr-only">
                Typ der Änderung {{ index + 1 }}
              </label>

              <select
                :id="'change-type-' + index"
                v-model="change.type"
                :disabled="!canEdit"
                class="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="bugfix">bugfix</option>
                <option value="improvement">improvement</option>
                <option value="feature">feature</option>
              </select>

              <label :for="'changes' + index" class="sr-only">
                Beschreibung der Änderung {{ index + 1 }}
              </label>

              <input
                :id="'changes' + index"
                type="text"
                v-model="change.description"
                :disabled="!canEdit"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <button
                type="button"
                @click="removeChange(index)"
                class="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-2 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                :aria-label="`Change ${index + 1} entfernen`"
                title="Change entfernen"
                :disabled="!canEdit"
              >
                ✕
              </button>
            </div>

            <div class="flex items-start justify-end pt-1">
              <FieldComments
                file-name="changelog.json"
                type="changelogs"
                :line="changeLine(index)"
                :comments="commentsList"
                :can-write="!!props.canWriteComments"
                :add-comment="addCommentFn"
                :reply-to-thread="props.replyToThread"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="addChange"
          class="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
          title="Change hinzufügen"
          :disabled="!canEdit"
        >
          + Add Change
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-600 mt-2">JSON Vorschau</h3>
      <pre class="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm">{{
        jsonPreview
      }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import FieldComments from "./FieldComments.vue";
import type { CommentItem, CommentType } from "../types";

interface Props {
  modelValue: string;
  canEdit: boolean;

  comments?: CommentItem[];
  canWriteComments?: boolean;
  addComment?: (p: {
    fileName: string;
    type: CommentType;
    line: number;
    body: string;
  }) => Promise<void>;
  replyToThread?: (p: {
    threadId: string;
    body: string;
    resolved: boolean;
  }) => Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  comments: () => [],
  canWriteComments: false,
});

const emit = defineEmits(["update:modelValue"]);

const changelog = reactive({
  "package-name": "",
  "package-version": "",
  changes: [] as { type: string; description: string }[],
});

function buildPreviewAndLineMap(
  input: typeof changelog
): { json: string; lineMap: number[] } {
  const lines: string[] = [];
  const lineMap: number[] = [];

  const push = (s: string) => lines.push(s);

  push("{");
  push(`  "package-name": ${JSON.stringify(input["package-name"])},`);
  push(`  "package-version": ${JSON.stringify(input["package-version"])},`);
  push('  "changes": [');

  input.changes.forEach((c, idx) => {
    lineMap[idx] = lines.length + 3;
    push("    {");
    push(`      "type": ${JSON.stringify(c.type)},`);
    push(`      "description": ${JSON.stringify(c.description)}`);
    push(idx === input.changes.length - 1 ? "    }" : "    },");
  });

  push("  ]");
  push("}");

  return { json: lines.join("\n"), lineMap };
}

const preview = computed(() => buildPreviewAndLineMap(changelog));
const jsonPreview = computed(() => preview.value.json);
const changeLine = (index: number) => preview.value.lineMap[index] ?? 1;

const commentsList = computed<CommentItem[]>(() =>
  Array.isArray(props.comments) ? props.comments : []
);

function addChange() {
  changelog.changes.push({ type: "bugfix", description: "" });
}

function removeChange(index: number) {
  changelog.changes.splice(index, 1);
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) return;
    try {
      Object.assign(changelog, JSON.parse(newVal));
    } catch (e) {
      console.error("Fehler beim Parsen modelValue (ChangelogJson):", e);
    }
  },
  { immediate: true }
);

watch(
  preview,
  () => {
    emit("update:modelValue", preview.value.json);
  },
  { deep: true, immediate: true }
);

const addCommentFn = async (p: {
  fileName: string;
  type: CommentType;
  line: number;
  body: string;
}) => {
  if (!props.addComment) return;
  await props.addComment(p);
};
</script>
