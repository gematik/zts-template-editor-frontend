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
    <div v-if="editor" class="container" @click="focusEditor">
        <!-- Toolbar -->
        <div class="toolbar-wrapper" @click.stop>
            <div class="toolbar-row">
            <div class="toolbar">
                <NTooltip>
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleBold().run()"
                            :type="editor.isActive('bold') ? 'primary' : 'default'">
                            <NIcon size="20">
                                <TextBold24Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Fett
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleItalic().run()"
                            :type="editor.isActive('italic') ? 'primary' : 'default'">
                            <NIcon size="20">
                                <TextItalic20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Kursiv
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().setParagraph().run()"
                            :type="editor.isActive('paragraph') ? 'primary' : 'default'">
                            <NIcon size="20">
                                <TextField20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Absatz
                </NTooltip>

                <div class="divider"></div>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                            :type="editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'">
                            <NIcon size="24">
                                <TextFontSize24Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Überschrift 1
                </NTooltip>
                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
                            :type="editor.isActive('heading', { level: 4 }) ? 'primary' : 'default'">
                            <NIcon size="20">
                                <TextFontSize20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Überschrift 2
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleHeading({ level: 5 }).run()"
                            :type="editor.isActive('heading', { level: 5 }) ? 'primary' : 'default'">
                            <NIcon size="16">
                                <TextFontSize16Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Überschrift 3
                </NTooltip>

                <div class="divider"></div>

                <!-- Bullet List -->
                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleBulletList().run()"
                            :type="editor.isActive('bulletList') ? 'primary' : 'default'">
                            <NIcon size="20">
                                <TextBulletListLtr20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Bullet List
                </NTooltip>

                <!-- Ordered List -->
                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="toggleDecimalList()"
                            :type="editor.isActive('orderedList', { listStyleType: 'decimal' }) ? 'primary' : 'default'">
                            <NIcon size="20">
                                <TextNumberListLtr20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Nummerierte Liste
                </NTooltip>

                <!-- Ordered List Alpha-->
                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="toggleAlphaList()"
                            :type="editor.isActive('orderedList', { listStyleType: 'loweralpha' }) ? 'primary' : 'default'">
                            <NIcon size="20">
                                <img src="@/assets/images/bullet-list-alpha.svg" alt="bullet list alpha" />
                            </NIcon>
                        </NButton>
                    </template>
                    Nummerierte Liste Alpha
                </NTooltip>

                <div class="divider"></div>

                <!-- Code -->
                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().toggleCodeBlock().run()"
                            :type="editor.isActive('codeBlock') ? 'primary' : 'default'">
                            <NIcon size="20">
                                <Code20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Code Block
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="openLinkModal"
                            :type="editor.isActive('link') ? 'primary' : 'default'">
                            <NIcon size="20">
                                <Link24Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Link setzen
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="removeLink" :disabled="!editor.isActive('link')">
                            <NIcon size="20">
                                <LinkDismiss20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Link entfernen
                </NTooltip>

                <div class="divider"></div>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().setHardBreak().run()">
                            <NIcon size="20">
                                <DocumentPageBreak20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Neue Zeile erzwingen
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().undo().run()"
                            :disabled="!editor.can().undo()">
                            <NIcon size="20">
                                <ArrowUndo20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Rückgängig
                </NTooltip>

                <NTooltip trigger="hover">
                    <template #trigger>
                        <NButton circle quaternary @click="editor.chain().focus().redo().run()"
                            :disabled="!editor.can().redo()">
                            <NIcon size="20">
                                <ArrowRedo20Regular />
                            </NIcon>
                        </NButton>
                    </template>
                    Wiederholen
                </NTooltip>


            </div>
            <div v-if="props.canWriteComments" class="comments-outside" @click.stop>
  <FieldComments
    file-name="download-conditions.xml"
    type="download_conditions"
    :line="1"
    :comments="props.comments ?? []"
    :can-write="!!props.canWriteComments"
    :add-comment="addCommentFn"
    :reply-to-thread="props.replyToThread"
  >
    <template #trigger>
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton circle quaternary>
            <NIcon size="20">
              <CommentMultiple20Regular />
            </NIcon>
          </NButton>
        </template>
        Kommentare
      </NTooltip>
    </template>
  </FieldComments>
</div>
            </div>
        </div>
        <EditorContent v-if="editor" :editor="editor" class="editor-content" />
    </div>

    <NModal v-model:show="showLinkModal">
        <NCard style="width: 420px" title="Link einfügen" closable @close="closeLinkModal">

            <div class="modal-field">
                <label for="linkUrl">URL</label>
                <NInput id="linkUrl" v-model:value="linkUrl" placeholder="https://example.com" />
            </div>

            <div class="modal-field">
                <label for="linkTitle">Titel des Links</label>
                <NInput id="linkTitle" v-model:value="linkTitle" placeholder="Tooltip Text…" />
            </div>

            <template #footer>
                <div style="display: flex; justify-content: space-between">

                    <NButton type="error" secondary @click="removeLink">
                        Entfernen
                    </NButton>

                    <div style="display: flex; gap: 8px">
                        <NButton @click="closeLinkModal">Abbrechen</NButton>
                        <NButton type="primary" @click="applyLink">
                            Übernehmen
                        </NButton>
                    </div>
                </div>
            </template>

        </NCard>
    </NModal>

</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from "vue"

import { NButton, NTooltip, NIcon, NModal, NCard, NInput } from "naive-ui"
import type { CommentItem, CommentType } from "../types";
import FieldComments from "../components/FieldComments.vue"

/* TipTap Editor*/
import { Editor, EditorContent, type Editor as TiptapEditor } from "@tiptap/vue-3"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import OrderedList from "@tiptap/extension-ordered-list"
import Placeholder from "@tiptap/extension-placeholder"

/* Icons */
import {
    TextBold24Regular,
    TextItalic20Regular,
    TextField20Regular,
    TextFontSize24Regular,
    TextFontSize20Regular,
    TextFontSize16Regular,
    Code20Regular,
    DocumentPageBreak20Regular,
    TextBulletListLtr20Regular,
    TextNumberListLtr20Regular,
    Link24Regular,
    LinkDismiss20Regular,
    ArrowUndo20Regular,
    ArrowRedo20Regular,
    CommentMultiple20Regular,
} from "@vicons/fluent"


/* Props */
const props = defineProps<{
    canEdit: boolean;
    disabled: boolean;
    // comments
    canWriteComments?: boolean;
    comments?: CommentItem[];
    addComment?: (p: { fileName: string; type: CommentType; line: number; body: string }) => Promise<void>;
    replyToThread?: (p: { threadId: string; body: string; resolved: boolean }) => Promise<void>;
    conditionsValue: string;   
    }>();


const emit = defineEmits(['update:conditionsValue']); 

/* Custom OrderedList variant for alphabet as bullet list*/
const OrderedListVariant = OrderedList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),

            variant: {
                default: "decimal",

                parseHTML: (el) =>
                    el.getAttribute("data-variant") || "decimal",

                renderHTML: (attrs) => ({
                    "data-variant": attrs.variant,
                    class: attrs.variant,
                }),
            },
        }
    },
})

const editor = shallowRef<TiptapEditor>()

const showLinkModal = ref(false)
const linkUrl = ref("")
const linkTitle = ref("")
function focusEditor(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.toolbar')) {
        editor.value?.chain().focus().run()
    }
}


onMounted(() => {
    editor.value = new Editor({
        extensions: [
            StarterKit.configure({
                orderedList: false,
                link: false,
            }),

            Link.configure({
                openOnClick: false,
            }),
            OrderedListVariant,
            Placeholder.configure({
                placeholder: 'Text eingeben...',
                emptyEditorClass: 'is-editor-empty',
                emptyNodeClass: 'is-empty',
            }),
        ],
        content: props.conditionsValue || "",
        autofocus: true,
        editable: !props.disabled,
        onUpdate: ({ editor }) => {
            emit('update:conditionsValue', editor.getHTML());
        },
    })
})

watch(() => props.conditionsValue, (newValue) => {
    if (editor.value && newValue !== editor.value.getHTML()) {
        editor.value.commands.setContent(newValue);
    }
})

watch(
    () => props.disabled,
    (isDisabled) => {
        if (!editor.value) return;
        editor.value.setEditable(!isDisabled);
        if (isDisabled) {
            editor.value.commands.blur();
        }
    },
    { immediate: true }
)


onBeforeUnmount(() => {
    editor.value?.destroy()
})


/* Toggle Decimal List */
function toggleDecimalList() {
    if (!editor.value) return

    if (!editor.value.isActive("orderedList")) {
        editor.value
            .chain()
            .focus()
            .toggleList("orderedList", "listItem")
            .updateAttributes("orderedList", { variant: "decimal" })
            .run()
        return
    }

    editor.value
        .chain()
        .focus()
        .updateAttributes("orderedList", { variant: "decimal" })
        .run()
}

/* Toggle Alpha List */
function toggleAlphaList() {
    if (!editor.value) return

    if (!editor.value.isActive("orderedList")) {
        editor.value
            .chain()
            .focus()
            .toggleList("orderedList", "listItem")
            .updateAttributes("orderedList", { variant: "loweralpha" })
            .run()
        return
    }

    editor.value
        .chain()
        .focus()
        .updateAttributes("orderedList", { variant: "loweralpha" })
        .run()
}


function openLinkModal() {
    if (!editor.value) return

    const attrs = editor.value.getAttributes("link")

    linkUrl.value = attrs.href || ""
    linkTitle.value = attrs.title || ""

    showLinkModal.value = true
}

function closeLinkModal() {
    showLinkModal.value = false
    linkUrl.value = ""
    linkTitle.value = ""
}

function applyLink() {
    if (!editor.value) return

    if (!linkUrl.value.trim()) {
        removeLink()
        return
    }

    editor.value
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
            href: linkUrl.value,
            title: linkTitle.value || null,
        })
        .run()

    closeLinkModal()
}

function removeLink() {
    if (!editor.value) return

    editor.value.chain().focus().unsetLink().run()
    closeLinkModal()
}

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

<style lang="css">
.container {
    width: 100%;
    position: relative;
    cursor: text;
}

.toolbar-wrapper {
    position: sticky;
    top: 120px;
    z-index: 100;
    background: white;
    margin-bottom: 12px;
}
.toolbar-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.toolbar {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fafafa;
}

.comments-outside {
  flex: 0 0 auto;
  padding-top: 6px;
}

.editor-content {
    margin-top: 10px;
    padding: 10px;
}

.divider {
    width: 1px;
    height: 20px;
    background: #ccc;
    margin: 0 6px;
}

.editor-box {
    margin-top: 12px;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 12px;
    min-height: 250px;
}

.comments-anchor {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 200;   
  display: flex;
  align-items: center;
}


.tiptap:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
}

.tiptap p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
    font-style: italic;
}

.tiptap.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
    font-style: italic;
}


.tiptap:focus::before {
    color: #6b7280;
}

.tiptap {
    min-height: 20rem;

    :first-child {
        margin-top: 1rem;
    }

    ul,
    ol {
        padding: 0 1rem;
        margin: 1.25rem 1rem 1.25rem 0.4rem;

        li p {
            margin-top: 0.25em;
            margin-bottom: 0.25em;
        }
    }

    ol.loweralpha {
        list-style-type: lower-alpha !important;
    }

    ol.decimal {
        list-style-type: decimal !important;
    }


    ul {
        list-style-type: disc;
    }

    ol {
        list-style-type: auto;
    }


    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        line-height: 1.1;
        margin-top: 2.5rem;
        text-wrap: pretty;
    }

    h3 {
        font-size: 1.1rem;
    }

    h4 {
        font-size: 1rem;
    }

    h5,
    h6 {
        font-size: 0.9rem;
    }

    code {
        background-color: #DBDBDB;
        border-radius: 0.4rem;
        color: #22097B;
        font-size: 0.85rem;
        padding: 0.25em 0.3em;
    }

    pre {
        background: #ccc;
        border-radius: 0.5rem;
        color: #212529;
        font-family: 'JetBrainsMono', monospace;
        margin: 1.5rem 0;
        padding: 0.75rem 1rem;

        code {
            background: none;
            color: inherit;
            font-size: 0.8rem;
            padding: 0;
        }
    }

    blockquote {
        border-left: 3px solid grey;
        margin: 1.5rem 0;
        padding-left: 1rem;
    }

    hr {
        border: none;
        border-top: 1px solid grey;
        margin: 2rem 0;
    }

    a {
        color: #0f1d65;
        text-decoration: none;
        font-weight: bold;
    }

    a:hover {
        text-decoration: underline;
    }
}
</style>