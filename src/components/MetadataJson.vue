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
    <h2 class="text-lg font-semibold">Metadaten</h2>

    <div class="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div class="space-y-1">
          <label for="packageName_metadata" class="block text-sm font-medium text-gray-600">
            Package Name
          </label>

          <input
            id="packageName_metadata"
            type="text"
            v-model="metadata['package-name']"
            disabled
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
        </div>

        <div class="flex items-start justify-end pt-8">
          <FieldComments
            file-name="metadata_package.json"
            type="metadata_package"
            :line="lineMap['package-name'] ?? 1"
            :comments="commentsList"
            :can-write="!!props.canWriteComments"
            :add-comment="addCommentFn"
            :reply-to-thread="props.replyToThread"
          />
        </div>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div class="space-y-1">
          <label for="packageVersion_metadata" class="block text-sm font-medium text-gray-600">
            Package Version
          </label>

          <input
            id="packageVersion_metadata"
            type="text"
            v-model="metadata['package-version']"
            disabled
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          />
        </div>

        <div class="flex items-start justify-end pt-8">
          <FieldComments
            file-name="metadata_package.json"
            type="metadata_package"
            :line="lineMap['package-version'] ?? 1"
            :comments="commentsList"
            :can-write="!!props.canWriteComments"
            :add-comment="addCommentFn"
            :reply-to-thread="props.replyToThread"
          />
        </div>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div class="space-y-1">
          <label for="status_metadata" class="block text-sm font-medium text-gray-600">
            Status
          </label>

          <select
            id="status_metadata"
            v-model="metadata.status"
            :disabled="!canEdit"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          >
            <option value="active">active</option>
            <option value="deprecated">deprecated</option>
            <option value="in-development">in-development</option>
          </select>
        </div>

        <div class="flex items-start justify-end pt-8">
          <FieldComments
            file-name="metadata_package.json"
            type="metadata_package"
            :line="lineMap['status'] ?? 1"
            :comments="commentsList"
            :can-write="!!props.canWriteComments"
            :add-comment="addCommentFn"
            :reply-to-thread="props.replyToThread"
          />
        </div>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div class="flex items-center gap-2 text-gray-600 text-sm h-10">
          <input
            id="publishToHl7_metadata"
            type="checkbox"
            v-model="metadata['publish-to-hl7']"
            :disabled="!canEdit"
            class="h-4 w-4 text-blue-500 rounded disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <label for="publishToHl7_metadata">Publish to HL7</label>
        </div>

        <div class="flex items-center justify-end h-10">
          <FieldComments
            file-name="metadata_package.json"
            type="metadata_package"
            :line="lineMap['publish-to-hl7'] ?? 1"
            :comments="commentsList"
            :can-write="!!props.canWriteComments"
            :add-comment="addCommentFn"
            :reply-to-thread="props.replyToThread"
          />
        </div>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div class="flex items-center gap-2 text-gray-600 text-sm h-10">
          <input
            id="protected_metadata"
            type="checkbox"
            v-model="metadata.protected"
            :disabled="!canEdit"
            class="h-4 w-4 text-blue-500 rounded disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <label for="protected_metadata">Protected</label>
        </div>

        <div class="flex items-center justify-end h-10">
          <FieldComments
            file-name="metadata_package.json"
            type="metadata_package"
            :line="lineMap['protected'] ?? 1"
            :comments="commentsList"
            :can-write="!!props.canWriteComments"
            :add-comment="addCommentFn"
            :reply-to-thread="props.replyToThread"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="additionalKeywords_metadata"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Additional Keywords*
          </label>
        </div>

        <div>
          <div class="flex gap-2">
            <input
              id="additionalKeywords_metadata"
              type="text"
              v-model="newKeyword"
              :disabled="!canEdit"
              @keyup.enter="addAdditionalKeyword"
              placeholder="Ein Keyword eingeben"
              class="flex-1 h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            />

            <NButton size="small" type="primary" data-testid="add-keyword-btn" :disabled="!canEdit" @click="addAdditionalKeyword" style="aspect-ratio: 1 / 1;">
              +
            </NButton>
            <NButton size="small" type="error" data-testid="remove-keyword-btn" :disabled="!canEdit" @click="clearAdditionalKeywords" style="aspect-ratio: 1 / 1;">
              -
            </NButton>
          </div>

          <div v-if="metadata['additional-keywords']?.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(k, i) in metadata['additional-keywords']"
              :key="`${k}-${i}`"
              class="bg-keyword-gematik-blue text-white px-3 py-2 rounded-md flex items-center gap-2"
            >
              <span
                :class="canEdit ? 'cursor-pointer' : 'opacity-60'"
                @click="canEdit && removeAdditionalKeyword(i)"
                title="Entfernen"
                :aria-disabled="canEdit ? 'false' : 'true'"
              >
                {{ k }} <span class="text-sm">×</span>
              </span>
            </span>
          </div>

          <p v-if="errors.additionalKeywords" class="text-red-600 text-sm mt-1">
            {{ errors.additionalKeywords }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            file-name="metadata_package.json"
            type="metadata_package"
            :line="lineMap['additional-keywords'] ?? 1"
            :comments="commentsList"
            :can-write="!!props.canWriteComments"
            :add-comment="addCommentFn"
            :reply-to-thread="props.replyToThread"
          />
        </div>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-600 mt-2">JSON Vorschau</h3>
      <pre class="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm">{{ jsonPreview }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from "vue";
import { NButton } from "naive-ui";
import FieldComments from "./FieldComments.vue";
import type { CommentItem, CommentType } from "../types";

interface Props {
  modelValue: string;
  canEdit: boolean;

  comments?: CommentItem[];
  canWriteComments?: boolean;
  addComment?: (p: { fileName: string; type: CommentType; line: number; body: string }) => Promise<void>;
  replyToThread?: (p: { threadId: string; body: string; resolved: boolean }) => Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  comments: () => [],
  canWriteComments: false,
});

const emit = defineEmits(["update:modelValue"]);

const metadata = reactive<{
  "package-name": string;
  "package-version": string;
  status: "active" | "deprecated" | "in-development";
  "publish-to-hl7": boolean;
  "additional-keywords": string[];
  protected: boolean;
}>({
  "package-name": "",
  "package-version": "",
  status: "active",
  "publish-to-hl7": false,
  "additional-keywords": [],
  protected: false,
});

const errors = reactive<{ additionalKeywords: string | null }>({ additionalKeywords: null });

const newKeyword = ref("");

const ADDITIONAL_KEYWORD_RE = /^[\p{L}0-9 _.-]{1,30}$/u;

const commentsList = computed<CommentItem[]>(() => (Array.isArray(props.comments) ? props.comments : []));

const canEdit = computed(() => props.canEdit);

function parseCommaSeparated(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function validateAdditionalKeywordsList(list: string[]) {
  if (!list || list.length === 0) {
    errors.additionalKeywords = "Mindestens 1 Keyword ist erforderlich.";
    return false;
  }

  const invalid = list.find((k) => !ADDITIONAL_KEYWORD_RE.test(k));
  if (invalid) {
    errors.additionalKeywords = `Ungültiges Keyword: "${invalid}" (Regex: ^[\\p{L}0-9 _.-]{1,30}$)`;
    return false;
  }

  errors.additionalKeywords = null;
  return true;
}

function addAdditionalKeyword() {
  const raw = newKeyword.value.trim();
  if (!raw) return;

  const items = parseCommaSeparated(raw);

  const invalid = items.find((k) => !ADDITIONAL_KEYWORD_RE.test(k));
  if (invalid) {
    errors.additionalKeywords = `Ungültiges Keyword: "${invalid}" (Regex: ^[\\p{L}0-9 _.-]{1,30}$)`;
    return;
  }

  for (const k of items) {
    if (!metadata["additional-keywords"].includes(k)) metadata["additional-keywords"].push(k);
  }

  newKeyword.value = "";
  validateAdditionalKeywordsList(metadata["additional-keywords"]);
  validateAndEmit();
}

function clearAdditionalKeywords() {
  metadata["additional-keywords"] = [];
  newKeyword.value = "";
  validateAdditionalKeywordsList([]);
  validateAndEmit();
}

function removeAdditionalKeyword(index: number) {
  metadata["additional-keywords"].splice(index, 1);
  validateAdditionalKeywordsList(metadata["additional-keywords"]);
  validateAndEmit();
}

function buildPreviewAndLineMap(input: typeof metadata): { json: string; lineMap: Record<string, number> } {
  const lines: string[] = [];
  const lineMap: Record<string, number> = {};
  const push = (s: string) => lines.push(s);

  push("{");

  lineMap["package-name"] = lines.length + 1;
  push(`  "package-name": ${JSON.stringify(input["package-name"])},`);

  lineMap["package-version"] = lines.length + 1;
  push(`  "package-version": ${JSON.stringify(input["package-version"])},`);

  lineMap["status"] = lines.length + 1;
  push(`  "status": ${JSON.stringify(input.status)},`);

  lineMap["publish-to-hl7"] = lines.length + 1;
  push(`  "publish-to-hl7": ${JSON.stringify(input["publish-to-hl7"])},`);

  lineMap["additional-keywords"] = lines.length + 1;
  push(`  "additional-keywords": ${JSON.stringify((input["additional-keywords"] ?? []).join(","))},`);

  lineMap["protected"] = lines.length + 1;
  push(`  "protected": ${JSON.stringify(input.protected)}`);

  push("}");

  return { json: lines.join("\n"), lineMap };
}

const preview = computed(() => buildPreviewAndLineMap(metadata));
const jsonPreview = computed(() => preview.value.json);
const lineMap = computed(() => preview.value.lineMap);

const addCommentFn = async (p: { fileName: string; type: CommentType; line: number; body: string }) => {
  if (!props.addComment) return;
  await props.addComment(p);
};

const lastEmitted = ref<string>("");
let syncingFromOutside = false;

function validateAndEmit() {
  validateAdditionalKeywordsList(metadata["additional-keywords"]);

  const next = preview.value.json;
  if (syncingFromOutside) return;

  if (next !== lastEmitted.value) {
    lastEmitted.value = next;
    emit("update:modelValue", next);
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) return;

    syncingFromOutside = true;

    try {
      const parsed = JSON.parse(newVal);

      const rawAk = parsed?.["additional-keywords"];
      let ak: string[] = [];
      if (Array.isArray(rawAk)) ak = rawAk.filter((x: any) => typeof x === "string");
      else if (typeof rawAk === "string") ak = parseCommaSeparated(rawAk);

      Object.assign(metadata, {
        "package-name": parsed?.["package-name"] ?? metadata["package-name"],
        "package-version": parsed?.["package-version"] ?? metadata["package-version"],
        status: parsed?.status ?? metadata.status,
        "publish-to-hl7": parsed?.["publish-to-hl7"] ?? metadata["publish-to-hl7"],
        "additional-keywords": ak,
        protected: parsed?.protected ?? metadata.protected,
      });

      newKeyword.value = "";
      validateAdditionalKeywordsList(metadata["additional-keywords"]);

      lastEmitted.value = buildPreviewAndLineMap(metadata).json;
    } catch (e) {
      console.error("Fehler beim Parsen modelValue (MetadataJson):", e);
    } finally {
      queueMicrotask(() => (syncingFromOutside = false));
    }
  },
  { immediate: true }
);

watch(
  metadata,
  () => {
    validateAndEmit();
  },
  { deep: true }
);
</script>
