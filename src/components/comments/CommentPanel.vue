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
  <div
    v-if="open"
    ref="panelEl"
    class="bg-white border border-gray-200 rounded-lg shadow-md p-3"
    :class="panelClass"
    @click.stop
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div>
        <h4 class="text-sm font-semibold">{{ title }}</h4>
        <div v-if="subtitle" class="text-xs text-gray-500">{{ subtitle }}</div>
      </div>

      <button
        type="button"
        @click="emit('close')"
        class="text-gray-400 hover:text-gray-700 text-sm hover:cursor-pointer"
        aria-label="Kommentare schließen"
        title="Schließen"
      >
        ✕
      </button>
    </div>

    <!-- Empty -->
    <div v-if="threads.length === 0" class="text-sm text-gray-400 mb-2">
      Keine Kommentare vorhanden
    </div>

    <!-- THREADS -->
    <div
      v-for="t in threads"
      :key="t.threadId"
      class="mb-3 border rounded-md overflow-hidden"
      :class="t.openCount > 0 ? 'border-orange-400' : 'border-gray-300'"
    >
      <div
        class="px-2 py-1 text-xs bg-gray-50 border-b border-gray-200 text-gray-500 flex items-center justify-between"
        :class="t.openCount > 0 ? 'bg-orange-100 text-orange-800 font-semibold' : ''"
      >
        <span>{{ threadHeaderLabel(t) }}</span>

        <span v-if="t.openCount > 0" class="text-orange-700">
          {{ t.openCount }} offen
        </span>
        <span v-else class="text-gray-400">
          Erledigt
        </span>
      </div>

      <!-- Messages -->
      <div
        v-for="c in t.comments"
        :key="c.id"
        class="border-t p-0 pl-0 border-gray-200"
      >
        <div
          class="p-2 ml-1 border-l-4 py-1 my-1.5 mr-1 rounded"
          :class="!c.resolved ? 'border-orange-300 bg-orange-50' : 'border-gray-200/0 bg-gray-50'"
        >
          <div class="text-xs text-gray-500 mb-1">
            {{ c.author }} · {{ formatDate(c.createdAt) }}
          </div>
          <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ displayBody(c.body) }}</div>
        </div>
      </div>

      <!-- Reply -->
      <div v-if="canWrite" class="p-2 border-t bg-gray-50 border-gray-200">
        <textarea
          v-model="replyBodies[t.threadId]"
          rows="2"
          placeholder="Antwort schreiben…"
          class="w-full border rounded p-2 text-sm text-gray-700 border-gray-300 bg-white"
        />

        <div class="mt-2 flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5">
          <div class="text-xs text-gray-700">
            Als <span class="font-semibold">erledigt</span> markieren
            <div class="text-[11px] text-gray-500">(oder ohne Text: sendet "Resolved")</div>
          </div>

          <NSwitch v-model:value="resolveOnReply[t.threadId]" size="small" />
        </div>

        <div class="flex justify-end mt-2">
          <NButton
            type="primary"
            size="small"
            :loading="!!submittingReply[t.threadId]"
            :disabled="
  !!submittingReply[t.threadId] ||
  (!(replyBodies[t.threadId] || '').trim() && !resolveOnReply[t.threadId])
"
            @click="submitReply(t.threadId)"
          >
            Antworten
          </NButton>
        </div>
      </div>
    </div>

    <!-- New comment -->
    <div v-if="canWrite" class="mt-3 border-t pt-3 border-gray-200">
      <div class="text-xs text-gray-500 mb-1">
        {{ newCommentLabel }}
      </div>

      <textarea
        v-model="newBody"
        rows="2"
        placeholder="Neuen Kommentar schreiben…"
        class="w-full border rounded p-2 text-sm text-gray-700 border-gray-300 bg-white"
      />

      <div class="flex justify-end mt-2">
        <NButton
          type="primary"
          :loading="submittingNew"
          :disabled="submittingNew || !newBody.trim()"
          @click="submitNew"
        >
          Kommentar hinzufügen
        </NButton>
      </div>
    </div>

    <div v-else class="text-sm text-gray-500">
      Kommentare können nur im Review (mit MR) geschrieben werden.
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { NButton, NSwitch } from "naive-ui";
import type { CommentItem } from "../../types";

export type ThreadView = {
  threadId: string;
  comments: CommentItem[];
  openCount: number;
  line?: number;
};

const props = withDefaults(
  defineProps<{
    open: boolean;

    title: string;
    subtitle?: string;

    newCommentLabel?: string;

    threadLabel?: (t: ThreadView) => string;

    canWrite: boolean;
    threads: ThreadView[];

    displayBody?: (raw: string) => string;

    onAdd: (body: string) => Promise<void>;
    onReply?: (threadId: string, body: string, resolved: boolean) => Promise<void>;

    closeOnOutside?: boolean;

    panelClass?: string;
  }>(),
  {
    subtitle: undefined,
    newCommentLabel: "Neuer Kommentar",
    threadLabel: undefined,
    displayBody: (s: string) => s ?? "",
    closeOnOutside: false,
    panelClass: "",
  }
);

const emit = defineEmits<{ (e: "close"): void }>();

const panelEl = ref<HTMLElement | null>(null);

const newBody = ref("");
const replyBodies = ref<Record<string, string>>({});
const resolveOnReply = ref<Record<string, boolean>>({});

const submittingNew = ref(false);
const submittingReply = ref<Record<string, boolean>>({});

function displayBody(raw: string) {
  return (props.displayBody ? props.displayBody(raw) : raw) ?? "";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function threadHeaderLabel(t: ThreadView) {
  if (props.threadLabel) return props.threadLabel(t);
  if (typeof t.line === "number") return `Zeile ${t.line}`;
  return "Thread";
}

async function submitNew() {
  const body = newBody.value.trim();
  if (!body || submittingNew.value) return;

  submittingNew.value = true;
  try {
    await props.onAdd(body);
    newBody.value = "";
  } finally {
    submittingNew.value = false;
  }
}

async function submitReply(threadId: string) {
  if (!props.onReply) return;

  const trimmed = (replyBodies.value[threadId] || "").trim();
  const resolved = !!resolveOnReply.value[threadId];

  if ((!trimmed && !resolved) || submittingReply.value[threadId]) return;

  const bodyToSend = trimmed || "Resolved";

  submittingReply.value = { ...submittingReply.value, [threadId]: true };
  try {
    await props.onReply(threadId, bodyToSend, resolved);

    replyBodies.value[threadId] = "";
    resolveOnReply.value[threadId] = false;
  } finally {
    submittingReply.value = { ...submittingReply.value, [threadId]: false };
  }
}

function onDocumentPointerDown(e: PointerEvent) {
  if (!props.open || !props.closeOnOutside) return;

  const panel = panelEl.value;
  const target = e.target as Node | null;
  if (!panel || !target) return;

  if (!panel.contains(target)) emit("close");
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, { capture: true });
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, { capture: true } as any);
});
</script>
