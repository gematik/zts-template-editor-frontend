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
  <div class="relative flex items-start gap-2">
    <!-- Trigger -->
    <button
      v-if="hasThreads || canWrite"
      @click.stop="open = !open"
      class="relative px-1.5 py-1 text-sm rounded border hover:shadow-sm hover:cursor-pointer"
      :class="hasOpen ? 'border-orange-300 text-orange-700 bg-orange-50' : 'border-gray-200 bg-white text-gray-500 hover:text-gray-700'"
      :title="triggerTitle"
    >
      <div v-if="hasOpen" v-html="errorCommentIcon" class="w-5 h-5 inline-block text-orange-600 align-middle"/>
      <div v-else v-html="addCommentIcon" class="w-5 h-5 inline-block text-gray-500 hover:text-gray-700 align-middle"/>
      <span v-if="openCount > 0" class="ml-1.5 text-xs font-semibold">
        {{ openCount }}
      </span>
    </button>

    <!-- Panel -->
    <CommentPanel
      :open="open"
      title="Kommentare"
      :subtitle="subtitle"
      :new-comment-label="newCommentLabel"
      :can-write="canWrite"
      :threads="threads"
      :display-body="displayBody"
      :thread-label="threadLabel"
      :close-on-outside="true"
      panel-class="absolute right-0 top-full mt-2 w-[420px] z-50"
      @close="open = false"
      :on-add="onAdd"
      :on-reply="replyToThread ? onReply : undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { CommentItem, CommentType } from "../types";
import addCommentIcon from "@/assets/images/add-comment.svg?raw";
import errorCommentIcon from "@/assets/images/error-comment.svg?raw";

import CommentPanel from "./comments/CommentPanel.vue";
import { useCommentView } from "../composables/useCommentView";

const props = withDefaults(
  defineProps<{
    fileName: string;
    type: CommentType;
    line: number;

    fieldKey?: string;
    displayScope?: "line" | "file";

    comments: CommentItem[];
    canWrite: boolean;

    addComment: (p: { fileName: string; type: CommentType; line: number; body: string }) => Promise<void>;
    replyToThread?: (p: { threadId: string; body: string; resolved: boolean }) => Promise<void>;
  }>(),
  {
    displayScope: "line",
  }
);

const open = ref(false);

const fieldKeyRef = computed(() => (props.fieldKey || "").trim() || null);
const lineRef = computed(() => props.line);
const scopeRef = computed(() => props.displayScope ?? "line");

const view = useCommentView({
  comments: computed(() => (Array.isArray(props.comments) ? props.comments : [])),
  fileName: computed(() => props.fileName),
  type: computed(() => props.type),
  line: lineRef,
  fieldKey: fieldKeyRef,
  displayScope: scopeRef,
});

const threads = computed(() =>
  view.threads.value.map((t) => ({
    threadId: t.threadId,
    comments: t.comments,
    openCount: t.openCount,
    line: t.line,
  }))
);

const openCount = computed(() => view.openCount.value);
const hasThreads = computed(() => threads.value.length > 0);
const hasOpen = computed(() => openCount.value > 0);

const modeLabel = computed<"field" | "line">(() => (fieldKeyRef.value ? "field" : "line"));

const triggerTitle = computed(() => {
  if (modeLabel.value === "field") return `Kommentare (Feld: ${fieldKeyRef.value})`;
  if (view.effectiveScope.value === "file") return "Kommentare (alle Zeilen)";
  return `Kommentare (Zeile ${props.line})`;
});

const subtitle = computed(() => {
  if (modeLabel.value === "field") return `Feld: ${fieldKeyRef.value}`;
  if (view.effectiveScope.value === "file") return "Gültig für alle Zeilen";
  return `Zeile ${props.line}`;
});

const newCommentLabel = computed(() => {
  if (modeLabel.value === "field") return `Neuer Kommentar für Feld ${fieldKeyRef.value}`;
  return `Neuer Kommentar (Zeile ${props.line})`;
});

function displayBody(raw: string) {
  return view.stripMarker(raw ?? "");
}

function threadLabel(t: { line?: number }) {
  if (modeLabel.value === "field") return `Feld: ${fieldKeyRef.value}`;
  return `Zeile ${t.line ?? props.line}`;
}

async function onAdd(body: string) {
  const finalBody = view.markerPrefix() + body.trim();
  if (!finalBody.trim()) return;

  await props.addComment({
    fileName: props.fileName,
    type: props.type,
    line: props.line,
    body: finalBody,
  });
}

async function onReply(threadId: string, body: string, resolved: boolean) {
  if (!props.replyToThread) return;

  const finalBody = view.markerPrefix() + body.trim();
  if (!finalBody.trim()) return;

  await props.replyToThread({
    threadId,
    body: finalBody,
    resolved: !!resolved,
  });
}
</script>
