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
import FieldComments from "./FieldComments.vue";
import type { CommentItem, CommentType } from "../types";

type TelecomItem = { system: string; value: string };
type ContactDetail = { name: string; telecom: TelecomItem[] };

const props = defineProps<{
  title: string;
  items: ContactDetail[];
  disabled: boolean;

  fileName: string;
  type: CommentType;
  comments: CommentItem[];
  canWrite: boolean;
  addComment: (p: {
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

  itemLineMap: number[];
  telecomLineMap: number[][];
}>();

const emit = defineEmits<{
  (e: "update:items", v: ContactDetail[]): void;
}>();

function emptyTelecom(): TelecomItem {
  return { system: "", value: "" };
}

function emptyContact(): ContactDetail {
  return { name: "", telecom: [] };
}

function clone(): ContactDetail[] {
  return (props.items || []).map((c) => ({
    name: c?.name ?? "",
    telecom: Array.isArray(c?.telecom)
      ? c.telecom.map((t) => ({
          system: t?.system ?? "",
          value: t?.value ?? "",
        }))
      : [],
  }));
}

function addItem() {
  const next = clone();
  next.push(emptyContact());
  emit("update:items", next);
}

function removeItem(index: number) {
  const next = clone();
  next.splice(index, 1);
  emit("update:items", next);
}

function addTelecom(ci: number) {
  const next = clone();
  const c = next[ci];
  if (!c) return;

  if (!Array.isArray(c.telecom)) {
    c.telecom = [];
  }

  c.telecom.push(emptyTelecom());
  emit("update:items", next);
}

function removeTelecom(ci: number, ti: number) {
  const next = clone();
  const c = next[ci];
  if (!c || !Array.isArray(c.telecom)) return;

  c.telecom.splice(ti, 1);
  emit("update:items", next);
}

function updateName(ci: number, v: string) {
  const next = clone();
  const c = next[ci];
  if (!c) return;

  c.name = v;
  emit("update:items", next);
}

function updateTelecom(
  ci: number,
  ti: number,
  key: "system" | "value",
  v: string
) {
  const next = clone();
  const c = next[ci];
  if (!c || !Array.isArray(c.telecom)) return;

  const t = c.telecom[ti];
  if (!t) return;

  t[key] = v;
  emit("update:items", next);
}

const itemLine = (i: number) => props.itemLineMap?.[i] ?? 1;
const telecomLine = (i: number, ti: number) =>
  props.telecomLineMap?.[i]?.[ti] ?? 1;
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="block text-sm font-medium text-gray-600">{{ title }}</span>

      <button
        type="button"
        @click="addItem"
        class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
        :disabled="disabled"
      >
        + Add
      </button>
    </div>

    <div
      v-for="(c, ci) in items"
      :key="ci"
      class="border rounded-lg p-3 space-y-3"
    >
      <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div class="flex items-start gap-2">
          <label class="sr-only" :for="`cd-name-${ci}`">
            {{ title }} name {{ ci + 1 }}
          </label>

          <input
            :id="`cd-name-${ci}`"
            type="text"
            :disabled="disabled"
            :value="c.name"
            @input="updateName(ci, ($event.target as HTMLInputElement).value)"
            placeholder="name"
            class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          <button
            type="button"
            @click="removeItem(ci)"
            class="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-2 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
            :disabled="disabled"
            :aria-label="`${title} ${ci + 1} entfernen`"
            title="Entfernen"
          >
            ✕
          </button>
        </div>

        <div class="flex items-start justify-end pt-1">
          <FieldComments
            :file-name="fileName"
            :type="type"
            :line="itemLine(ci)"
            :comments="comments"
            :can-write="canWrite"
            :add-comment="addComment"
            :reply-to-thread="replyToThread"
            :field-key="title + '[' + ci + ']'"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-600">telecom</span>

          <button
            type="button"
            @click="addTelecom(ci)"
            class="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
            :disabled="disabled"
          >
            + Add Telecom
          </button>
        </div>

        <p
          v-if="!Array.isArray(c.telecom) || c.telecom.length === 0"
          class="text-sm text-gray-400"
        >
          Keine Telecom-Einträge.
        </p>

        <div v-for="(t, ti) in c.telecom" :key="ti">
          <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
            <div class="flex gap-2 items-start">
              <label
                class="sr-only"
                :for="`cd-telecom-system-${ci}-${ti}`"
              >
                {{ title }} {{ ci + 1 }} telecom {{ ti + 1 }} system
              </label>

              <input
                :id="`cd-telecom-system-${ci}-${ti}`"
                type="text"
                :disabled="disabled"
                :value="t.system"
                @input="
                  updateTelecom(
                    ci,
                    ti,
                    'system',
                    ($event.target as HTMLInputElement).value
                  )
                "
                placeholder="system (url/email/...)"
                class="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <label
                class="sr-only"
                :for="`cd-telecom-value-${ci}-${ti}`"
              >
                {{ title }} {{ ci + 1 }} telecom {{ ti + 1 }} value
              </label>

              <input
                :id="`cd-telecom-value-${ci}-${ti}`"
                type="text"
                :disabled="disabled"
                :value="t.value"
                @input="
                  updateTelecom(
                    ci,
                    ti,
                    'value',
                    ($event.target as HTMLInputElement).value
                  )
                "
                placeholder="value"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <button
                type="button"
                @click="removeTelecom(ci, ti)"
                class="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-2 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
                :disabled="disabled"
                :aria-label="`${title} ${ci + 1} telecom ${ti + 1} entfernen`"
                title="Entfernen"
              >
                ✕
              </button>
            </div>

            <div class="flex items-start justify-end pt-1">
              <FieldComments
                :file-name="fileName"
                :type="type"
                :line="telecomLine(ci, ti)"
                :comments="comments"
                :can-write="canWrite"
                :add-comment="addComment"
                :reply-to-thread="replyToThread"
                :field-key="title + '[' + ci + '].telecom[' + ti + ']'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
