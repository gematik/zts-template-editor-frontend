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
import FieldComments from "../../components/FieldComments.vue";

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
                type: { type: String, default: undefined },
                size: { type: String, default: undefined },
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

                // Default Container
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
    line: number;
    body: string;
    author: string;
    createdAt: string;
    resolved: boolean;
};

function c(overrides: Partial<CommentItem> = {}): CommentItem {
    return {
        id: overrides.id ?? crypto.randomUUID?.() ?? String(Math.random()),
        threadId: overrides.threadId ?? null,
        fileName: overrides.fileName ?? "file.json",
        type: overrides.type ?? ("metadata" as any),
        line: overrides.line ?? 10,
        body: overrides.body ?? "Hello",
        author: overrides.author ?? "A",
        createdAt: overrides.createdAt ?? "2025-01-01T10:00:00.000Z",
        resolved: overrides.resolved ?? false,
    };
}

function mountComp(overrides: any = {}) {
    const addComment = vi.fn().mockResolvedValue(undefined);
    const replyToThread = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(FieldComments as any, {
        attachTo: document.body,
        props: {
            fileName: "file.json",
            type: "metadata" as any,
            line: 10,
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

describe("FieldComments.vue (neu)", () => {
    it("zeigt Trigger nur wenn hasThreads oder canWrite", () => {
        const a = mountComp({ comments: [], canWrite: false });
        expect(a.wrapper.find("button").exists()).toBe(false);
        a.wrapper.unmount();

        const b = mountComp({ comments: [], canWrite: true });
        expect(b.wrapper.find("button").exists()).toBe(true);
        b.wrapper.unmount();

        const d = mountComp({
            canWrite: false,
            comments: [c({ body: "x", line: 10 })],
        });
        expect(d.wrapper.find("button").exists()).toBe(true);
        d.wrapper.unmount();
    });

    it("triggerTitle: line-scope default => 'Zeile <line>'", () => {
        const { wrapper } = mountComp({
            canWrite: true,
            displayScope: "line",
            line: 77,
        });

        const trigger = wrapper.find("button");
        expect(trigger.attributes("title")).toContain("Zeile 77");
    });

    it("triggerTitle: file-scope => 'alle Zeilen'", () => {
        const { wrapper } = mountComp({
            canWrite: true,
            displayScope: "file",
            line: 77,
        });

        const trigger = wrapper.find("button");
        expect(trigger.attributes("title")).toContain("alle Zeilen");
    });

    it("triggerTitle: fieldKey => Feld-Modus", () => {
        const { wrapper } = mountComp({
            canWrite: true,
            fieldKey: " Contact[0] ",
            displayScope: "line",
        });

        const trigger = wrapper.find("button");
        expect(trigger.attributes("title")).toContain("Feld: Contact[0]");
    });

    it("öffnet Panel beim Trigger-Click und schließt über X", async () => {
        const { wrapper } = mountComp({ canWrite: true });

        expect(wrapper.text()).not.toContain("Kommentare");

        await wrapper.find("button").trigger("click");
        expect(wrapper.text()).toContain("Kommentare");

        const xBtn = wrapper.find('button[aria-label="Kommentare schließen"]');
        expect(xBtn.exists()).toBe(true);
        await xBtn.trigger("click");

        expect(wrapper.text()).not.toContain("Kommentare");
    });

    it("schließt Panel bei outside pointerdown", async () => {
        const { wrapper } = mountComp({ canWrite: true });

        await wrapper.find("button").trigger("click");
        expect(wrapper.text()).toContain("Kommentare");

        document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).not.toContain("Kommentare");
    });

    it("line-scope filtert nur passende line + fileName + type", async () => {
        const { wrapper } = mountComp({
            canWrite: true,
            fileName: "file.json",
            type: "metadata",
            line: 10,
            displayScope: "line",
            comments: [
                c({ id: "a", fileName: "file.json", type: "metadata", line: 10, body: "ok" }),
                c({ id: "b", fileName: "file.json", type: "metadata", line: 11, body: "NO" }),
                c({ id: "c", fileName: "other.json", type: "metadata", line: 10, body: "NO" }),
                c({ id: "d", fileName: "file.json", type: "otherType", line: 10, body: "NO" }),
            ],
        });

        await wrapper.find("button").trigger("click");

        expect(wrapper.text()).toContain("ok");
        expect(wrapper.text()).not.toContain("NO");
    });

    it("file-scope zeigt alle lines (aber gleiche fileName+type)", async () => {
        const { wrapper } = mountComp({
            canWrite: true,
            fileName: "file.json",
            type: "metadata",
            line: 10,
            displayScope: "file",
            comments: [
                c({ id: "a", fileName: "file.json", type: "metadata", line: 10, body: "L10" }),
                c({ id: "b", fileName: "file.json", type: "metadata", line: 11, body: "L11" }),
                c({ id: "c", fileName: "other.json", type: "metadata", line: 10, body: "NO" }),
            ],
        });

        await wrapper.find("button").trigger("click");

        expect(wrapper.text()).toContain("L10");
        expect(wrapper.text()).toContain("L11");
        expect(wrapper.text()).not.toContain("NO");
    });

    it("fieldKey filtert nur Marker-kompatible Bodies; Anzeige strippt Marker", async () => {
        const { wrapper } = mountComp({
            canWrite: true,
            fileName: "file.json",
            type: "metadata",
            fieldKey: "X",
            comments: [
                c({ id: "a", body: "[[field:X]] Sichtbar", line: 1 }),
                c({ id: "b", body: "[[field:Y]] NO", line: 1 }),
                c({ id: "c", body: "ohne marker NO", line: 1 }),
            ],
        });

        await wrapper.find("button").trigger("click");

        expect(wrapper.text()).toContain("Sichtbar");
        expect(wrapper.text()).not.toContain("NO");
        expect(wrapper.text()).not.toContain("[[field:X]]");
    });

    it("Trigger zeigt openCount als Zahl nur wenn >0", () => {
        const a = mountComp({
            canWrite: false,
            comments: [c({ resolved: true, body: "x" })],
        });
        const aBtn = a.wrapper.find("button");
        expect(aBtn.exists()).toBe(true);
        expect(aBtn.text()).not.toContain("1");
        a.wrapper.unmount();

        const b = mountComp({
            canWrite: false,
            comments: [c({ resolved: false, body: "x" })],
        });
        const bBtn = b.wrapper.find("button");
        expect(bBtn.exists()).toBe(true);
        expect(bBtn.text()).toContain("1");
        b.wrapper.unmount();
    });

    it("submitNew: ruft addComment (trim + marker wenn fieldKey) und cleared textarea", async () => {
        const { wrapper, addComment } = mountComp({
            canWrite: true,
            fileName: "file.json",
            type: "metadata",
            line: 10,
            fieldKey: "X",
            comments: [],
        });

        await wrapper.find("button").trigger("click");

        const composerTa = wrapper.find('textarea[placeholder*="Kommentar"], textarea');
        expect(composerTa.exists()).toBe(true);

        await composerTa.setValue("  Hallo  ");

        const sendBtn =
            wrapper.findAll("button").find((b) => /hinzufügen|senden/i.test(b.text().trim())) ??
            wrapper.findAll("button").find((b) => /kommentar/i.test(b.text().trim()));

        expect(sendBtn).toBeTruthy();
        await sendBtn!.trigger("click");

        expect(addComment).toHaveBeenCalledTimes(1);
        expect(addComment.mock.calls[0]![0]).toEqual({
            fileName: "file.json",
            type: "metadata",
            line: 10,
            body: "[[field:X]] Hallo",
        });

        expect((composerTa.element as HTMLTextAreaElement).value).toBe("");
    });

    it("submitReply: ruft replyToThread (trim + marker) und cleared", async () => {
        const { wrapper, replyToThread } = mountComp({
            canWrite: true,
            fieldKey: "X",
            comments: [c({ id: "1", threadId: "t1", body: "[[field:X]] orig", resolved: false })],
        });

        await wrapper.find("button").trigger("click");

        const replyTa = wrapper.find('textarea[placeholder*="Antwort"], textarea');
        expect(replyTa.exists()).toBe(true);
        await replyTa.setValue("  Antwort  ");
        await wrapper.vm.$nextTick();

        const replyBtn = wrapper.findAll("button").find((b) => b.text().trim().toLowerCase() === "antworten");
        expect(replyBtn).toBeTruthy();
        await replyBtn!.trigger("click");
        await wrapper.vm.$nextTick();

        expect(replyToThread).toHaveBeenCalledTimes(1);
        expect(replyToThread.mock.calls[0]![0]).toEqual({
            threadId: "t1",
            body: "[[field:X]] Antwort",
            resolved: false,
        });

        expect((replyTa.element as HTMLTextAreaElement).value).toBe("");
    });

    it("submitReply: wenn replyToThread fehlt => kein Crash", async () => {
        const { wrapper } = mountComp({
            canWrite: true,
            replyToThread: undefined,
            comments: [c({ id: "1", threadId: "t1", body: "x", resolved: false })],
        });

        await wrapper.find("button").trigger("click");

        const replyBtn = wrapper.findAll("button").find((b) => b.text().trim().toLowerCase() === "antworten");
        if (replyBtn) await replyBtn.trigger("click");

        expect(true).toBe(true);
    });
});