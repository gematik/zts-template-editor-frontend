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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import MarkdownEditorWithPreviewComments from "../../components/MarkdownEditorWithPreviewComments.vue";

vi.mock("naive-ui", async (importOriginal) => {
    const actual = await importOriginal<any>();

    const Stub = (name: string) =>
        defineComponent({
            name,
            inheritAttrs: false,
            props: {
                value: { type: [String, Number, Boolean, Object, Array], default: undefined },
                checked: { type: Boolean, default: undefined },
                disabled: { type: Boolean, default: false },
                loading: { type: Boolean, default: false },
                placeholder: { type: String, default: undefined },
            },
            emits: ["update:value", "update:checked", "click", "input", "change"],
            setup(props, { slots, emit, attrs }) {
                if (name === "NInput") {
                    return () =>
                        h("textarea", {
                            ...attrs,
                            placeholder: (props as any).placeholder,
                            value: (props as any).value ?? "",
                            onInput: (e: any) => {
                                emit("update:value", e?.target?.value);
                                emit("input", e);
                            },
                        });
                }

                if (name === "NSwitch") {
                    return () =>
                        h("input", {
                            ...attrs,
                            type: "checkbox",
                            checked: (props as any).checked ?? (props as any).value ?? false,
                            onChange: (e: any) => {
                                const v = !!e?.target?.checked;
                                emit("update:checked", v);
                                emit("update:value", v);
                                emit("change", e);
                            },
                        });
                }

                if (name === "NButton") {
                    return () =>
                        h(
                            "button",
                            {
                                ...attrs,
                                disabled: (props as any).disabled || (props as any).loading,
                                onClick: (e: any) => emit("click", e),
                            },
                            slots.default?.()
                        );
                }

                return () => h("div", { ...attrs }, slots.default?.());
            },
        });

    return {
        ...actual,
        NButton: actual?.NButton ?? Stub("NButton"),
        NInput: actual?.NInput ?? Stub("NInput"),
        NSwitch: actual?.NSwitch ?? Stub("NSwitch"),
        NCard: actual?.NCard ?? Stub("NCard"),
        NCollapse: actual?.NCollapse ?? Stub("NCollapse"),
        NCollapseItem: actual?.NCollapseItem ?? Stub("NCollapseItem"),
    };
});

type CommentItem = {
    id: string;
    threadId?: string | null;
    fileName: string;
    type: any;
    line?: number;
    body: string;
    author: string;
    createdAt: string;
    resolved: boolean;
};

function c(overrides: Partial<CommentItem> = {}): CommentItem {
    return {
        id: overrides.id ?? String(Math.random()),
        threadId: overrides.threadId ?? null,
        fileName: overrides.fileName ?? "f.md",
        type: overrides.type ?? ("package_markdown" as any),
        line: overrides.line ?? 1,
        body: overrides.body ?? "Hi",
        author: overrides.author ?? "A",
        createdAt: overrides.createdAt ?? "2025-01-01T10:00:00.000Z",
        resolved: overrides.resolved ?? false,
    };
}

function mountComp(overrides: any = {}) {
    const addComment = vi.fn().mockResolvedValue(undefined);
    const replyToThread = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(MarkdownEditorWithPreviewComments as any, {
        attachTo: document.body,
        props: {
            id: "md-1",
            label: "Label",
            rows: 8,
            modelValue: "line1\nline2",
            disabled: false,
            fileName: "f.md",
            type: "package_markdown" as any,
            comments: [],
            canWrite: false,
            addComment,
            replyToThread,
            ...overrides,
        },
    });

    return { wrapper, addComment, replyToThread };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    document.body.innerHTML = "";
});

describe("MarkdownEditorWithPreviewComments.vue (neu)", () => {
    it("rendert label + textarea + preview (leer => 'Keine Vorschau verfügbar')", async () => {
        const { wrapper } = mountComp({ modelValue: "" });

        expect(wrapper.find("label").text()).toBe("Label");

        const ta = wrapper.find("textarea#md-1");
        expect(ta.exists()).toBe(true);

        const preview = wrapper.find(".prose");
        expect(preview.exists()).toBe(true);
        expect(preview.html()).toContain("Keine Vorschau verfügbar");
    });

    it("lineCount => Gutter line-number buttons passend", async () => {
        const { wrapper } = mountComp({ modelValue: "a\nb\nc" });
        const lineBtns = wrapper.findAll('button[title^="Kommentare zu Zeile"]');
        expect(lineBtns.length).toBe(3);
        expect(lineBtns[0]!.text().trim()).toBe("1");
        expect(lineBtns[2]!.text().trim()).toBe("3");
    });

    it("öffnet Panel für Zeile und zeigt Subtitle 'Zeile X'", async () => {
        const { wrapper } = mountComp({ canWrite: true, modelValue: "a\nb\nc" });

        await wrapper.find('button[title="Kommentare zu Zeile 3"]').trigger("click");

        expect(wrapper.text()).toContain("Kommentare zu dieser Stelle");
        expect(wrapper.text()).toContain("Zeile 3");
    });

    it("submit: addComment(fileName/type/activeLine/body) (trim) und reset", async () => {
        const { wrapper, addComment } = mountComp({
            canWrite: true,
            modelValue: "a\nb\nc",
            comments: [],
        });

        await wrapper.find('button[title="Kommentare zu Zeile 2"]').trigger("click");
        expect(wrapper.text()).toContain("Zeile 2");

        const composerTa = wrapper.find('textarea[placeholder="Kommentar…"], textarea[placeholder="Kommentar..."], textarea[placeholder*="Kommentar"]');
        expect(composerTa.exists()).toBe(true);
        expect(composerTa.attributes("id")).not.toBe("md-1");
        await composerTa.setValue("  Hallo  ");
        await wrapper.vm.$nextTick();

        const buttons = wrapper.findAll("button");
        const sendCandidates = buttons.filter((b) => /^(Senden|Kommentar hinzufügen)$/i.test(b.text().trim()));
        expect(sendCandidates.length).toBeGreaterThan(0);

        const sendBtn = sendCandidates[sendCandidates.length - 1]!;
        await sendBtn.trigger("click");
        await wrapper.vm.$nextTick();

        expect(addComment).toHaveBeenCalledTimes(1);
        expect(addComment.mock.calls[0]![0]).toEqual({
            fileName: "f.md",
            type: "package_markdown",
            line: 2,
            body: "Hallo",
        });

        expect((composerTa.element as HTMLTextAreaElement).value).toBe("");
    });

    it("submit: replyToThread(threadId/body/resolved) wenn Thread existiert", async () => {
        const { wrapper, replyToThread } = mountComp({
            canWrite: true,
            modelValue: "a\nb",
            comments: [c({ id: "m1", threadId: "t1", line: 1, body: "x", resolved: false })],
        });

        await wrapper.find('button[title="Kommentare zu Zeile 1"]').trigger("click");
        expect(wrapper.text()).toContain("Kommentare zu dieser Stelle");
        expect(wrapper.text()).toContain("Zeile 1");

        const replyTa = wrapper
            .findAll("textarea")
            .find((t) => (t.attributes("placeholder") ?? "").toLowerCase().includes("antwort"));
        expect(replyTa).toBeTruthy();

        await replyTa!.setValue(" Reply ");
        await wrapper.vm.$nextTick();

        const replyBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Antworten");
        expect(replyBtn).toBeTruthy();

        await replyBtn!.trigger("click");
        await wrapper.vm.$nextTick();

        expect(replyToThread).toHaveBeenCalledTimes(1);
        expect(replyToThread.mock.calls[0]![0]).toEqual({
            threadId: "t1",
            body: "Reply",
            resolved: false,
        });

        expect((replyTa!.element as HTMLTextAreaElement).value).toBe("");
    });

    it("outside pointerdown schließt Panel", async () => {
        const { wrapper } = mountComp({ canWrite: true });

        await wrapper.find('button[title="Kommentare zu Zeile 1"]').trigger("click");
        expect(wrapper.text()).toContain("Kommentare zu dieser Stelle");

        document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).not.toContain("Kommentare zu dieser Stelle");
    });

    it("closePanel über X", async () => {
        const { wrapper } = mountComp({ canWrite: true });

        await wrapper.find('button[title="Kommentare zu Zeile 1"]').trigger("click");
        expect(wrapper.text()).toContain("Kommentare zu dieser Stelle");

        const xBtn = wrapper.find('button[aria-label="Kommentare schließen"]');
        expect(xBtn.exists()).toBe(true);

        await xBtn.trigger("click");
        expect(wrapper.text()).not.toContain("Kommentare zu dieser Stelle");
    });
});