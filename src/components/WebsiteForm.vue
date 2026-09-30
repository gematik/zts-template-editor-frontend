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
    <MetaJson
      v-model="localMetaJson"
      :can-edit="canEdit"
      :comments="metaJsonComments"
      :can-write-comments="canWrite"
      :add-comment="addCommentFn"
      :reply-to-thread="replyToThreadFn"
    />

    <ChangelogJson
      v-model="localChangelogsJson"
      :can-edit="canEdit"
      :comments="changelogComments"
      :can-write-comments="canWrite"
      :add-comment="addCommentFn"
      :reply-to-thread="replyToThreadFn"
    />

    <h3 class="mt-4 text-lg font-semibold text-slate-800">
      Package Beschreibungen
    </h3>

    <div class="space-y-6">
      <MarkdownEditorWithPreviewComments
        v-for="section in markdownSections"
        :key="section.key"
        :id="`pkg-md-${section.key}`"
        :label="section.label"
        :rows="8"
        :model-value="localMarkdown[section.key] || ''"
        :disabled="!canEdit"
        :file-name="section.fileName"
        :type="('package_markdown' as CommentType)"
        :comments="packageMarkdownComments"
        :can-write="canWrite"
        :add-comment="addCommentFn"
        :reply-to-thread="replyToThreadFn"
        @update:modelValue="(v) => onPackageMarkdownUpdate(section.key, v)"
      />
    </div>

    <TemplateMarkdownsSection
      :mode="mode"
      :template-states="templateStates"
      :disabled="!canEdit"
      :comments="templateMarkdownComments"
      :can-write="canWrite"
      :add-comment="addCommentFn"
      :reply-to-thread="replyToThreadFn"
      @update="(p) => emit('update:template-markdown', p)"
      @valid="(valid) => emit('template-markdown-valid', valid)"
      @remove="(i) => emit('remove-template-markdown', i)"
      @add="() => emit('add-template-markdown')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import MetaJson from "../components/MetadataJson.vue";
import ChangelogJson from "../components/ChangelogJson.vue";
import TemplateMarkdownsSection from "../components/TemplateMarkdownsSection.vue";
import MarkdownEditorWithPreviewComments from "../components/MarkdownEditorWithPreviewComments.vue";
import type {
  TemplateMarkdownState,
  MarkdownContent,
  MarkdownSection,
  CommentType,
  CommentItem
} from "../types";

const props = withDefaults(
  defineProps<{
    metaJson: string;
    changelogsJson: string;
    markdown: MarkdownContent;
    templateStates?: TemplateMarkdownState[];
    canEdit?: boolean;
    mode?: "create" | "createFrom" | "edit";
    packageName: string;
    packageVersion?: string;

    comments?: CommentItem[];
    canWriteComments?: boolean;
    addComment?: (p: { fileName: string; type: CommentType; line: number; body: string }) => Promise<void>;
    replyToThread?: (p: { threadId: string; body: string; resolved: boolean }) => Promise<void>;
  }>(),
  {
    metaJson: "",
    changelogsJson: "",
    markdown: () => ({
      external: "",
      fhir: "",
      author: "",
      cycles: "",
      generic: ""
    }),
    templateStates: () => [],
    canEdit: false,
    mode: "edit",
    packageVersion: "",
    packageName: "",
    comments: () => [],
    canWriteComments: false
  }
);

const emit = defineEmits<{
  (event: "update:meta-json", value: string): void;
  (event: "update:changelogs-json", value: string): void;
  (event: "update:markdown", value: MarkdownContent): void;
  (event: "update:template-markdown", payload: { index: number; version:string; canonicalUrl: string; value: string }): void;
  (event: "template-markdown-valid", value: boolean): void;
  (event: "add-template-markdown"): void;
  (event: "remove-template-markdown", index: number): void;
}>();

const localMetaJson = ref(props.metaJson ?? "");
const localChangelogsJson = ref(props.changelogsJson ?? "");
const localMarkdown = ref<MarkdownContent>({ ...props.markdown });

const commentsList = computed<CommentItem[]>(() =>
  Array.isArray(props.comments) ? props.comments : []
);

const changelogComments = computed(() =>
  commentsList.value.filter((c) => c.type === ("changelogs" as CommentType))
);

const metaJsonComments = computed(() =>
  commentsList.value.filter((c) => c.type === ("metadata_package" as CommentType))
);

const packageMarkdownComments = computed(() =>
  commentsList.value.filter((c) => c.type === ("package_markdown" as CommentType))
);

const templateMarkdownComments = computed(() =>
  commentsList.value.filter(
    (c) =>
      c.type === ("template_markdown" as CommentType) ||
      c.type === ("update_index_url_version" as CommentType)
  )
);

const canWrite = computed(() => !!props.canWriteComments);

const addCommentFn = (p: { fileName: string; type: CommentType; line: number; body: string }) => {
  if (!props.addComment) return Promise.resolve();
  return props.addComment(p);
};

const replyToThreadFn = (p: { threadId: string; body: string; resolved: boolean }) => {
  if (!props.replyToThread) return Promise.resolve();
  return props.replyToThread(p);
};

const markdownSections = computed<MarkdownSection[]>(() => [
  { key: "external", label: "ExternalSources", fileName: "externalSources.md" },
  { key: "fhir", label: "FhirConversionNotes", fileName: "fhirConversionNotes.md" },
  { key: "author", label: "NoteOnAuthor", fileName: "noteOnAuthor.md" },
  { key: "cycles", label: "NotesOnUpdateCycles", fileName: "notesOnUpdateCycles.md" },
  { key: "generic", label: "GenericDescription", fileName: "descriptionGeneric.md" }
]);

watch(() => props.metaJson, (next) => (localMetaJson.value = next ?? ""));
watch(() => props.changelogsJson, (next) => (localChangelogsJson.value = next ?? ""));

watch(
  () => props.markdown,
  (next) => {
    localMarkdown.value = {
      ...(next ?? { external: "", fhir: "", author: "", cycles: "", generic: "" })
    };
  },
  { deep: true }
);

watch(localMetaJson, (next) => emit("update:meta-json", next));
watch(localChangelogsJson, (next) => emit("update:changelogs-json", next));

function onPackageMarkdownUpdate(key: keyof MarkdownContent, value: string) {
  localMarkdown.value[key] = value;
  emit("update:markdown", { ...localMarkdown.value });
}
</script>
