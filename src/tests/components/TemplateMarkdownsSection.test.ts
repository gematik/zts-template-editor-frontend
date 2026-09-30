/*
 * Copyright (Change Date see Readme), gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ******
 *
 * For additional notes and disclaimer from gematik and in case of changes
 * by gematik, find details in the "Readme" file.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TemplateMarkdownsSection from "../../components/TemplateMarkdownsSection.vue";

type TemplateMarkdownState = {
    originalCanonicalUrl?: string;
    canonicalUrl?: string;
    originalVersion?: string;
    version?: string;
    markdown?: string;
};

const FieldCommentsStub = {
    name: "FieldComments",
    props: ["fileName", "type", "line", "comments", "canWrite", "addComment", "replyToThread"],
    template: `<div class="field-comments-stub">FieldComments</div>`,
};

const MarkdownEditorWithPreviewCommentsStub = {
    name: "MarkdownEditorWithPreviewComments",
    props: ["id", "label", "rows", "modelValue", "disabled", "fileName", "type", "comments", "canWrite"],
    emits: ["update:modelValue"],
    template: `
    <div class="md-editor-stub">
      <div class="md-editor-props">
        <span class="file">{{ fileName }}</span>
        <span class="disabled">{{ String(disabled) }}</span>
      </div>
      <textarea
        class="md-input"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      ></textarea>
    </div>
  `,
};

function mountComp(overrides: any = {}) {
    const addComment = vi.fn().mockResolvedValue(undefined);
    const replyToThread = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(TemplateMarkdownsSection as any, {
        props: {
            mode: "edit",
            templateStates: [],
            disabled: false,
            comments: [],
            canWrite: true,
            addComment,
            replyToThread,
            ...overrides,
        },
        global: {
            stubs: {
                FieldComments: FieldCommentsStub,
                MarkdownEditorWithPreviewComments: MarkdownEditorWithPreviewCommentsStub,
            },
        },
    });

    return { wrapper, addComment, replyToThread };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("TemplateMarkdownsSection.vue", () => {
    it("rendert nichts wenn mode !== 'edit'", () => {
        const { wrapper } = mountComp({ mode: "create" });
        expect(wrapper.html()).toBe("<!--v-if-->");
    });

    it("zeigt 'Keine Templates vorhanden.' wenn templateStates leer", () => {
        const { wrapper } = mountComp({ templateStates: [] });
        expect(wrapper.text()).toContain("Keine Templates vorhanden.");
    });

    it("rendert pro Template Inputs + MarkdownEditor + Delete Button", () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
            { version: "2.0.0", canonicalUrl: "http://c2", markdown: "md2", originalCanonicalUrl: "http://c2" },
        ];

        const { wrapper } = mountComp({ templateStates });

        const inputs = wrapper.findAll('input[type="text"]');
        expect(inputs.length).toBe(4);

        const editors = wrapper.findAll(".md-editor-stub");
        expect(editors.length).toBe(2);

        const deleteButtons = wrapper.findAll("button").filter((b) => b.text().includes("Löschen"));
        expect(deleteButtons.length).toBe(2);

        const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Markdown-Template hinzufügen"));
        expect(addBtn).toBeTruthy();
    });

    it("disabled=true deaktiviert Inputs und Buttons", () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];

        const { wrapper } = mountComp({ templateStates, disabled: true });

        const inputs = wrapper.findAll('input[type="text"]');
        expect((inputs[0]!.element as HTMLInputElement).disabled).toBe(true);
        expect((inputs[1]!.element as HTMLInputElement).disabled).toBe(true);

        const deleteBtn = wrapper.findAll("button").find((b) => b.text().includes("Löschen"))!;
        expect((deleteBtn.element as HTMLButtonElement).disabled).toBe(true);

        const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Markdown-Template hinzufügen"))!;
        expect((addBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it("klick auf 'Markdown-Template hinzufügen' emittiert add", async () => {
        const { wrapper } = mountComp({ templateStates: [] });

        const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Markdown-Template hinzufügen"))!;
        await addBtn.trigger("click");

        const emits = wrapper.emitted("add");
        expect(emits).toBeTruthy();
        expect(emits!.length).toBe(1);
    });

    it("klick auf Löschen emittiert remove(index)", async () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
            { version: "2.0.0", canonicalUrl: "http://c2", markdown: "md2", originalCanonicalUrl: "http://c2" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const deleteButtons = wrapper.findAll("button").filter((b) => b.text().includes("Löschen"));
        await deleteButtons[0]!.trigger("click");

        const emits = wrapper.emitted("remove");
        expect(emits).toBeTruthy();
        expect(emits![0]![0]).toBe(0);
    });

    it("Änderung Version-Input emittiert update mit version + canonicalUrl + markdown", async () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const inputs = wrapper.findAll('input[type="text"]');
        const versionInput = inputs[0]!;
        await versionInput.setValue("9.9.9");

        const emits = wrapper.emitted("update");
        expect(emits).toBeTruthy();

        const payload = emits![emits!.length - 1]![0] as any;
        expect(payload).toEqual({
            index: 0,
            version: "9.9.9",
            canonicalUrl: "http://c1",
            value: "md1",
        });
    });

    it("Änderung Canonical-Input emittiert update mit canonicalUrl + version + markdown", async () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const inputs = wrapper.findAll('input[type="text"]');
        const canonicalInput = inputs[1]!;
        await canonicalInput.setValue("http://neu");

        const emits = wrapper.emitted("update");
        expect(emits).toBeTruthy();

        const payload = emits![emits!.length - 1]![0] as any;
        expect(payload).toEqual({
            index: 0,
            version: "1.0.0",
            canonicalUrl: "http://neu",
            value: "md1",
        });
    });

    it("MarkdownEditor update:modelValue emittiert update mit value + aktueller version/canonicalUrl", async () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const mdTa = wrapper.find(".md-editor-stub .md-input");
        await mdTa.setValue("# Neu");

        const emits = wrapper.emitted("update");
        expect(emits).toBeTruthy();

        const payload = emits![emits!.length - 1]![0] as any;
        expect(payload).toEqual({
            index: 0,
            version: "1.0.0",
            canonicalUrl: "http://c1",
            value: "# Neu",
        });
    });

    it("übergibt an MarkdownEditor fileName aus templateFileName(version;canonicalUrl) (Stub prüft es)", () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const fileSpan = wrapper.find(".md-editor-stub .file");
        expect(fileSpan.text()).toBe("1.0.0;http://c1");
    });

    it("rendert FieldComments für canonical mapping (index.json)", () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const fc = wrapper.findAll(".field-comments-stub");
        expect(fc.length).toBeGreaterThan(0);

        const fcComp = wrapper.findComponent(FieldCommentsStub as any);
        expect(fcComp.exists()).toBe(true);
        expect((fcComp.props() as any).fileName).toBe("index.json");
    });

    it("blockiert ungültige Zeichen in der Template-Version", async () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const versionInput = wrapper.findAll('input[type="text"]')[0]!;
        await versionInput.setValue("1.0.0-alpha");

        expect((versionInput.element as HTMLInputElement).value).toBe("1.0.0");
        expect(wrapper.emitted("update")).toBeFalsy();
    });

    it("emittiert valid=false wenn bestehende Template-Version ungültig ist", () => {
        const templateStates: TemplateMarkdownState[] = [
            { version: "1.0.0-alpha", canonicalUrl: "http://c1", markdown: "md1", originalCanonicalUrl: "http://c1" },
        ];
        const { wrapper } = mountComp({ templateStates });

        const valid = wrapper.emitted("valid");
        expect(valid).toBeTruthy();
        expect(valid![valid!.length - 1]![0]).toBe(false);
        expect(wrapper.text()).toContain("Erlaubt sind nur Buchstaben, Zahlen, Punkt und Unterstrich.");
    });

});
