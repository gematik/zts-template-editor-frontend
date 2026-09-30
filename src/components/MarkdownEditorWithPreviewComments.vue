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
  <div class="space-y-2">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <!-- headers -->
      <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700">
        {{ label }}
      </label>
      <div class="block text-sm font-medium text-gray-700">Vorschau</div>

      <!-- Editor -->
      <div class="relative">
        <div class="relative flex border border-gray-300 rounded-lg overflow-hidden bg-white">
          <!-- Gutter -->
          <div class="select-none bg-gray-50 border-r border-gray-200 py-2">
            <div
              v-for="lineNo in lineCount"
              :key="lineNo"
              class="flex items-center justify-end gap-2 px-2 h-[22px]"
            >
              <!-- comment marker/counter -->
              <button
                v-if="canWrite || view.openCountForLine(lineNo) > 0 || view.totalCount(lineNo) > 0"
                type="button"
                class="w-7 h-5 flex items-center justify-center rounded border text-xs hover:shadow-sm hover:cursor-pointer"
                :class="view.openCountForLine(lineNo) > 0
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:text-gray-700'"
                :title="view.openCountForLine(lineNo) > 0
                  ? `${view.openCountForLine(lineNo)} offene Kommentare`
                  : (view.totalCount(lineNo) > 0 ? `${view.totalCount(lineNo)} Kommentare` : 'Kommentar hinzufügen')"
                @click="openForLine(lineNo)"
              >
                <div v-if="view.openCountForLine(lineNo) > 0" v-html="errorCommentIcon" class="w-4 h-4 inline-block align-middle"/>
                <div v-else v-html="addCommentIcon" class="w-4 h-4 inline-block align-middle"/>
                <span v-if="view.openCountForLine(lineNo) > 0" class="ml-1 font-semibold">
                  {{ view.openCountForLine(lineNo) }}
                </span>
              </button>

              <!-- line number -->
              <button
                type="button"
                class="w-8 text-right text-xs rounded px-1"
                :class="activeLine === lineNo ? 'text-slate-900 font-semibold bg-slate-100' : 'text-gray-400 hover:text-gray-700'"
                @click="openForLine(lineNo)"
                :title="`Kommentare zu Zeile ${lineNo}`"
              >
                {{ lineNo }}
              </button>
            </div>
          </div>

          <!-- Textarea -->
          <textarea
            :id="id"
            v-model="localValue"
            :rows="rowsComputed"
            :disabled="disabledComputed"
            class="w-full p-3 text-sm outline-none resize-y disabled:cursor-not-allowed disabled:bg-gray-50"
            @input="onInput"
            @click="syncActiveLineFromCursor"
            @keyup="syncActiveLineFromCursor"
          />
        </div>

        <!-- Panel -->
        <CommentPanel
          :open="panelOpen"
          title="Kommentare zu dieser Stelle"
          :subtitle="`Zeile ${activeLine}`"
          :new-comment-label="`Neuer Kommentar (Zeile ${activeLine})`"
          :can-write="canWrite"
          :threads="panelThreads"
          :thread-label="(t) => `Zeile ${t.line ?? activeLine}`"
          :display-body="(s) => s"
          :close-on-outside="true"
          panel-class="absolute right-0 top-full mt-2 w-[28rem] z-50"
          @close="closePanel"
          :on-add="onAdd"
          :on-reply="replyToThread ? onReply : undefined"
        />
      </div>

      <!-- Preview -->
      <div>
        <div
          class="border border-gray-300 rounded-lg p-3 bg-gray-50 prose prose-slate max-w-none min-h-[200px] overflow-auto"
          v-html="previewHtml"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { marked } from "marked";
import type { CommentItem, CommentType } from "../types";
import addCommentIcon from "@/assets/images/add-comment.svg?raw";
import errorCommentIcon from "@/assets/images/error-comment.svg?raw";

import CommentPanel from "./comments/CommentPanel.vue";
import { useCommentView } from "../composables/useCommentView";

const props = defineProps<{
  id: string;
  label?: string;
  rows?: number;

  modelValue: string;
  disabled?: boolean;

  fileName: string;
  type: CommentType;

  comments: CommentItem[];
  canWrite: boolean;

  addComment: (p: { fileName: string; type: CommentType; line: number; body: string }) => Promise<void>;
  replyToThread?: (p: { threadId: string; body: string; resolved: boolean }) => Promise<void>;
}>();

const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();

const rowsComputed = computed(() => (props.rows && props.rows > 9 ? props.rows : 9));
const disabledComputed = computed(() => !!props.disabled);

const localValue = ref(props.modelValue ?? "");
watch(() => props.modelValue, (v) => {
  if (v !== localValue.value) localValue.value = v ?? "";
});

function onInput() {
  emit("update:modelValue", localValue.value);
}

const previewHtml = computed(() => {
  const md = localValue.value ?? "";
  if (!md.trim()) return '<p class="text-gray-400 italic">Keine Vorschau verfügbar</p>';
  try {
    return marked.parse(md, { async: false, breaks: true }) as string;
  } catch {
    return '<p class="text-red-600">Fehler beim Rendern der Vorschau</p>';
  }
});

const lineCount = computed(() => {
  const v = localValue.value ?? "";
  return Math.max(1, v.split("\n").length);
});

const activeLine = ref(1);
const panelOpen = ref(false);

// useCommentView for editor (line scope, no field markers)
const view = useCommentView({
  comments: computed(() => (Array.isArray(props.comments) ? props.comments : [])),
  fileName: computed(() => props.fileName),
  type: computed(() => props.type),
  line: computed(() => activeLine.value),
  fieldKey: computed(() => null),
  displayScope: computed(() => "line"),
});

// threads for active line (already filtered by view via line ref)
const panelThreads = computed(() =>
  view.threads.value.map((t) => ({
    threadId: t.threadId,
    comments: t.comments,
    openCount: t.openCount,
    line: t.line,
  }))
);

function openForLine(lineNo: number) {
  activeLine.value = Math.max(1, lineNo);
  panelOpen.value = true;
}

function syncActiveLineFromCursor(e: Event) {
  const el = e.target as HTMLTextAreaElement | null;
  if (!el) return;

  const pos = el.selectionStart ?? 0;
  const before = (el.value ?? "").slice(0, pos);
  activeLine.value = Math.max(1, before.split("\n").length);
}

function closePanel() {
  panelOpen.value = false;
}

async function onAdd(body: string) {
  const text = body.trim();
  if (!text) return;

  await props.addComment({
    fileName: props.fileName,
    type: props.type,
    line: activeLine.value,
    body: text,
  });
}

async function onReply(threadId: string, body: string, resolved: boolean) {
  if (!props.replyToThread) return;

  const text = body.trim();
  if (!text) return;

  await props.replyToThread({
    threadId,
    body: text,
    resolved: !!resolved,
  });
}
</script>
