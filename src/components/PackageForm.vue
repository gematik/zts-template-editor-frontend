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
import { computed, reactive, watch, ref } from "vue";
import type { PackageModel, CommentItem, CommentType } from "../types";
import { validatePackageTemplate } from "../validation/rules";
import { NButton, NMessageProvider } from "naive-ui";
import FieldComments from "./FieldComments.vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    readOnlyFields?: Array<keyof PackageModel>;
    disabled?: boolean;
    locked?: boolean;
    packageName: string;
    version?: string;

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
  }>(),
  {
    comments: () => [],
    canWriteComments: false,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
  (e: "update:version", v: string): void;
  (e: "update:packageName", v: string): void;
  (e: "valid", v: boolean): void;
}>();

function toPackageTemplatePayload(input: PackageModel): Record<string, unknown> {
  const trimmedDependencies = (input.dependencies || "").trim();
  const trimmedCopyright = (input.copyright || "").trim();
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  return {
    title: input.title,
    description: input.description,
    author: input.author,
    ...(trimmedDependencies ? { dependencies: trimmedDependencies } : {}),
    altTitle: input.altTitle,
    ...(trimmedCopyright ? { copyright: trimmedCopyright } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
  };
}

function buildEmitJson(input: PackageModel): string {
  return JSON.stringify(toPackageTemplatePayload(input), null, 2);
}

function parseEmittedModel(json: string) {
  try {
    const o = JSON.parse(json || "{}");
    return {
      title: o.title ?? "",
      description: o.description ?? "",
      author: o.author ?? "",
      dependencies: o.dependencies ?? "",
      altTitle: o.altTitle ?? "",
      copyright: o.copyright ?? "",
      keywords: Array.isArray(o.keywords) ? o.keywords : [],
    };
  } catch {
    return {
      title: "",
      description: "",
      author: "",
      dependencies: "",
      altTitle: "",
      copyright: "",
      keywords: [],
    };
  }
}

const form = reactive<PackageModel>({
  packagename: props.packageName ?? "",
  version: props.version ?? "",
  ...parseEmittedModel(props.modelValue),
});

const errors = reactive<Record<string, string | null>>({});
const newKeyword = ref("");

const locked = computed(() => !!props.disabled);

// comments helpers
const commentsList = computed<CommentItem[]>(() =>
  Array.isArray(props.comments) ? props.comments : []
);
const canWrite = computed(() => !!props.canWriteComments);

const addCommentFn = (p: {
  fileName: string;
  type: CommentType;
  line: number;
  body: string;
}) => {
  if (!props.addComment) return Promise.resolve();
  return props.addComment(p);
};

const replyToThreadFn = (p: { threadId: string; body: string; resolved: boolean }) => {
  if (!props.replyToThread) return Promise.resolve();
  return props.replyToThread(p);
};

// ---- JSON preview + lineMap ----
const commentFileName = "package.template.json";
const commentType = "package_template" as CommentType;

function buildPreviewAndLineMap(
  input: PackageModel
): { json: string; lineMap: Record<string, number> } {
  const payload = toPackageTemplatePayload(input);
  const json = JSON.stringify(payload, null, 2);
  const lineMap: Record<string, number> = {
    packagename: 1,
    version: 1,
  };

  const lines = json.split("\n");

  lines.forEach((line, index) => {
    const match = line.match(/^\s+"([^"]+)":/);
    if (match?.[1]) {
      lineMap[match[1]] = index + 1;
    }
  });

  return { json, lineMap };
}

const preview = computed(() => buildPreviewAndLineMap(form));
const jsonPreview = computed(() => preview.value.json);

const lastEmitted = ref(buildEmitJson(form));
let syncingFromOutside = false;

watch(
  () => props.modelValue,
  (v) => {
    syncingFromOutside = true;

    const parsed = parseEmittedModel(v);

    form.title = parsed.title;
    form.description = parsed.description;
    form.author = parsed.author;
    form.dependencies = parsed.dependencies;
    form.altTitle = parsed.altTitle;
    form.copyright = parsed.copyright;
    form.keywords = [...parsed.keywords];

    lastEmitted.value = buildEmitJson(form);

    queueMicrotask(() => {
      syncingFromOutside = false;
    });
  },
  { immediate: true }
);

watch(
  () => props.packageName,
  (v) => {
    if (v !== undefined && v !== form.packagename) {
      form.packagename = v;
    }
  },
  { immediate: true }
);

watch(
  () => props.version,
  (v) => {
    if (v !== undefined && v !== form.version) {
      form.version = v;
    }
  },
  { immediate: true }
);

function validateAndEmit() {
  const e = validatePackageTemplate(form);

  for (const k of Object.keys(errors)) {
    delete errors[k];
  }

  for (const [k, v] of Object.entries(e)) {
    errors[k] = v;
  }

  emit("valid", Object.values(e).every((x) => !x));

  if (syncingFromOutside) return;

  emit("update:packageName", form.packagename);
  emit("update:version", form.version);

  const next = buildEmitJson(form);

  if (next !== lastEmitted.value) {
    lastEmitted.value = next;
    emit("update:modelValue", next);
  }
}

watch(
  form,
  () => {
    validateAndEmit();
  },
  { deep: true }
);

// ---- Keywords ----
function addKeyword() {
  const k = newKeyword.value.trim();
  if (!k) return;
  if (!form.keywords.includes(k)) form.keywords.push(k);
  newKeyword.value = "";
}

function clearKeywords() {
  form.keywords = [];
  newKeyword.value = "";
  errors.keywords = null;
}

function removeKeyword(index: number) {
  form.keywords.splice(index, 1);
}
</script>

<template>
  <NMessageProvider>
    <div class="bg-white p-6 rounded-lg shadow space-y-6">
      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="packagename"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Packagename*
          </label>
        </div>

        <div>
          <input
            id="packagename"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked || readOnlyFields?.includes('packagename')"
            v-model="form.packagename"
            placeholder="z. B. bfarm.terminologien.ops"
          />
          <p v-if="errors.packagename" class="text-red-600 text-sm mt-1">
            {{ errors.packagename }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="packagename"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="version"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Version*
          </label>
        </div>

        <div>
          <input
            id="version"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked || readOnlyFields?.includes('version')"
            v-model="form.version"
            placeholder="z. B. 2025.1.0"
          />
          <p v-if="errors.version" class="text-red-600 text-sm mt-1">
            {{ errors.version }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="version"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="title"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Title*
          </label>
        </div>

        <div>
          <input
            id="title"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked"
            v-model="form.title"
            placeholder="Titel der Terminologie"
          />
          <p v-if="errors.title" class="text-red-600 text-sm mt-1">
            {{ errors.title }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="title"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="description"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Description*
          </label>
        </div>

        <div>
          <textarea
            id="description"
            class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-400 min-h-[120px] disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked"
            v-model="form.description"
            placeholder="Kurzbeschreibung des Pakets"
          ></textarea>
          <p v-if="errors.description" class="text-red-600 text-sm mt-1">
            {{ errors.description }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="description"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="author"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Author*
          </label>
        </div>

        <div>
          <input
            id="author"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked"
            v-model="form.author"
            placeholder="z. B. BfArM"
          />
          <p v-if="errors.author" class="text-red-600 text-sm mt-1">
            {{ errors.author }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="author"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label for="dependencies" class="w-full font-semibold text-gray-700 px-2 py-1 rounded">
            Dependencies
          </label>
        </div>

        <div>
          <input
            id="dependencies"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked"
            v-model="form.dependencies"
            placeholder="a.b.c#1.2.3; d.e.f#4.5.6"
          />
          <p v-if="errors.dependencies" class="text-red-600 text-sm mt-1">
            {{ errors.dependencies }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="dependencies"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="altTitle"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Alt Title*
          </label>
        </div>

        <div>
          <input
            id="altTitle"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked"
            v-model="form.altTitle"
            placeholder="Alternativer Titel"
          />
          <p v-if="errors.altTitle" class="text-red-600 text-sm mt-1">
            {{ errors.altTitle }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="altTitle"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label for="copyright" class="w-full font-semibold text-gray-700 px-2 py-1 rounded">
            Copyright
          </label>
        </div>

        <div>
          <input
            id="copyright"
            type="text"
            class="w-full h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
            :disabled="locked"
            v-model="form.copyright"
            placeholder="z. B. © 2023 Mein Unternehmen"
          />
          <p v-if="errors.copyright" class="text-red-600 text-sm mt-1">
            {{ errors.copyright }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="copyright"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
        <div class="h-10 flex items-center">
          <label
            for="keywords"
            class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded"
          >
            Keywords*
          </label>
        </div>

        <div>
          <div class="flex gap-2">
            <input
              id="keywords"
              type="text"
              class="flex-1 h-10 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
              v-model="newKeyword"
              :disabled="locked"
              @keyup.enter="addKeyword"
              placeholder="Ein Keyword eingeben"
            />
            <NButton size="small" type="primary" :disabled="locked" @click="addKeyword" style="aspect-ratio: 1 / 1;">+</NButton>
            <NButton size="small" type="error" :disabled="locked" @click="clearKeywords" style="aspect-ratio: 1 / 1;">-</NButton>
          </div>

          <div v-if="form.keywords?.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(k, i) in form.keywords"
              :key="i"
              class="bg-keyword-gematik-blue text-white px-2 py-1 rounded flex items-center gap-1"
            >
              <span
                :class="locked ? 'opacity-60' : 'cursor-pointer'"
                @click="!locked && removeKeyword(i)"
                title="Entfernen"
                :aria-disabled="locked ? 'true' : 'false'"
              >
                {{ k }} <span class="text-xs">×</span>
              </span>
            </span>
          </div>

          <p v-if="errors.keywords" class="text-red-600 text-sm mt-1">
            {{ errors.keywords }}
          </p>
        </div>

        <div class="h-10 flex items-center">
          <FieldComments
            :file-name="commentFileName"
            :type="commentType"
            :line=1
            field-key="keywords"
            :comments="commentsList"
            :can-write="canWrite"
            :add-comment="addCommentFn"
            :reply-to-thread="replyToThreadFn"
          />
        </div>
      </div>

      <div class="pt-2">
        <h3 class="text-sm font-medium text-gray-600 mt-2">JSON Vorschau</h3>
        <pre class="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm">{{ jsonPreview }}</pre>
      </div>
    </div>
  </NMessageProvider>
</template>
