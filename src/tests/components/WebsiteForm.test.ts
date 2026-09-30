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

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import WebsiteForm from "../../components/WebsiteForm.vue";
import type { CommentItem, CommentType } from "../../types";

type MarkdownContent = {
  external: string;
  fhir: string;
  author: string;
  cycles: string;
  generic: string;
  [key: string]: string;
};

type TemplateMarkdownState = {
  version?: string;
  canonicalUrl?: string;
  originalVersion?: string;
  originalCanonicalUrl?: string;
  markdown?: string;
};

// ----- stubs -----

const MetaJsonStub = defineComponent({
  name: "MetaJson",
  props: {
    modelValue: { type: String, default: "" },
    canEdit: { type: Boolean, default: false },
    comments: { type: Array, default: () => [] },
    canWriteComments: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("textarea", {
        "data-testid": "meta-json",
        "data-can-edit": props.canEdit ? "1" : "0",
        value: props.modelValue,
        onInput: (e: any) => emit("update:modelValue", e.target.value),
      });
  },
});

const ChangelogJsonStub = defineComponent({
  name: "ChangelogJson",
  props: {
    modelValue: { type: String, default: "" },
    canEdit: { type: Boolean, default: false },
    comments: { type: Array, default: () => [] },
    canWriteComments: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("textarea", {
        "data-testid": "changelog-json",
        "data-can-edit": props.canEdit ? "1" : "0",
        value: props.modelValue,
        onInput: (e: any) => emit("update:modelValue", e.target.value),
      });
  },
});

const MarkdownEditorStub = defineComponent({
  name: "MarkdownEditorWithPreviewComments",
  props: {
    id: String,
    label: String,
    rows: Number,
    modelValue: String,
    disabled: Boolean,
    fileName: String,
    type: String,
    comments: Array,
    canWrite: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("textarea", {
        "data-testid": `md-${props.id}`,
        "data-section": props.id,
        "data-file": props.fileName,
        "data-disabled": props.disabled ? "1" : "0",
        value: props.modelValue ?? "",
        onInput: (e: any) => emit("update:modelValue", e.target.value),
      });
  },
});

const TemplateMarkdownsSectionStub = defineComponent({
  name: "TemplateMarkdownsSection",
  props: {
    mode: String,
    templateStates: Array,
    disabled: Boolean,
    comments: Array,
    canWrite: Boolean,
  },
  emits: ["update", "valid", "remove", "add"],
  setup(props, { emit }) {
    return () =>
      h("div", { "data-testid": "tmpl-section", "data-disabled": props.disabled ? "1" : "0" }, [
        h(
          "button",
          { "data-testid": "tmpl-add", onClick: () => emit("add") },
          "add"
        ),
        h(
          "button",
          {
            "data-testid": "tmpl-update",
            onClick: () => emit("update", { index: 0, canonicalUrl: "x.md", value: "hi" }),
          },
          "update"
        ),
        h(
          "button",
          {
            "data-testid": "tmpl-valid",
            onClick: () => emit("valid", false),
          },
          "valid"
        ),
        h(
          "button",
          { "data-testid": "tmpl-remove", onClick: () => emit("remove", 0) },
          "remove"
        ),
      ]);
  },
});

function mountWithProps(extra?: Partial<InstanceType<typeof WebsiteForm>["$props"]>) {
  const baseMarkdown: MarkdownContent = {
    external: "EXT",
    fhir: "FHIR",
    author: "AUTH",
    cycles: "CYC",
    generic: "GEN",
  };

  return mount(WebsiteForm as any, {
    props: {
      metaJson: '{"foo":"bar"}',
      changelogsJson: '{"log":"entry"}',
      markdown: baseMarkdown,
      templateStates: [] as TemplateMarkdownState[],
      canEdit: true,
      mode: "edit",
      packageName: "pkg",
      packageVersion: "1.0.0",
      comments: [],
      canWriteComments: false,
      ...(extra ?? {}),
    },
    global: {
      stubs: {
        MetaJson: MetaJsonStub,
        ChangelogJson: ChangelogJsonStub,
        MarkdownEditorWithPreviewComments: MarkdownEditorStub,
        TemplateMarkdownsSection: TemplateMarkdownsSectionStub,
      },
    },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("WebsiteForm (updated)", () => {
  it("rendert 5 MarkdownEditor sections mit korrekten fileName + modelValue", () => {
    const wrapper = mountWithProps();

    const editors = wrapper.findAll('textarea[data-testid^="md-pkg-md-"]');
    expect(editors.length).toBe(5);

    const ids = editors.map((e) => e.attributes("data-section"));
    expect(ids).toContain("pkg-md-external");
    expect(ids).toContain("pkg-md-fhir");
    expect(ids).toContain("pkg-md-author");
    expect(ids).toContain("pkg-md-cycles");
    expect(ids).toContain("pkg-md-generic");

    const external = wrapper.find('[data-testid="md-pkg-md-external"]');
    expect((external.element as HTMLTextAreaElement).value).toBe("EXT");

    expect(external.attributes("data-file")).toBe("externalSources.md");
    const fhir = wrapper.find('[data-testid="md-pkg-md-fhir"]');
    expect(fhir.attributes("data-file")).toBe("fhirConversionNotes.md");
  });

  it("disabled wird auf MarkdownEditor/TemplateMarkdownsSection gesetzt wenn !canEdit", async () => {
    const wrapper1 = mountWithProps({ canEdit: false });
    const external1 = wrapper1.find('[data-testid="md-pkg-md-external"]');
    expect(external1.attributes("data-disabled")).toBe("1");
    expect(wrapper1.find('[data-testid="tmpl-section"]').attributes("data-disabled")).toBe("1");

    void (await nextTick());
  });

  it("MetaJson v-model: update:modelValue => emit update:meta-json", async () => {
    const wrapper = mountWithProps();

    const metaTa = wrapper.find('[data-testid="meta-json"]');
    await metaTa.setValue("NEUES_META_JSON");
    await nextTick();

    const emits = wrapper.emitted("update:meta-json");
    expect(emits).toBeTruthy();
    expect(emits![emits!.length - 1]![0]).toBe("NEUES_META_JSON");
  });

  it("ChangelogJson v-model: update:modelValue => emit update:changelogs-json", async () => {
    const wrapper = mountWithProps();

    const ta = wrapper.find('[data-testid="changelog-json"]');
    await ta.setValue("NEUES_CHANGELOG_JSON");
    await nextTick();

    const emits = wrapper.emitted("update:changelogs-json");
    expect(emits).toBeTruthy();
    expect(emits![emits!.length - 1]![0]).toBe("NEUES_CHANGELOG_JSON");
  });

  it("onPackageMarkdownUpdate: update:modelValue vom Editor => emit update:markdown (copy)", async () => {
    const wrapper = mountWithProps();

    const external = wrapper.find('[data-testid="md-pkg-md-external"]');
    await external.setValue("NEW_EXT");
    await nextTick();

    const emits = wrapper.emitted("update:markdown");
    expect(emits).toBeTruthy();
    const payload = emits![emits!.length - 1]![0] as MarkdownContent;
    expect(payload.external).toBe("NEW_EXT");
    expect(payload.fhir).toBe("FHIR");
  });

  it("watch props.markdown: prop update ersetzt localMarkdown", async () => {
    const wrapper = mountWithProps({
      markdown: { external: "A", fhir: "B", author: "", cycles: "", generic: "" },
    });

    await wrapper.setProps({
      markdown: { external: "X", fhir: "Y", author: "Z", cycles: "", generic: "" },
    });
    await nextTick();

    const external = wrapper.find('[data-testid="md-pkg-md-external"]');
    const fhir = wrapper.find('[data-testid="md-pkg-md-fhir"]');
    expect((external.element as HTMLTextAreaElement).value).toBe("X");
    expect((fhir.element as HTMLTextAreaElement).value).toBe("Y");
  });

  it("watch props.metaJson/changelogsJson: prop update synced local, und watcher emittiert update:*", async () => {
    const wrapper = mountWithProps();

    await wrapper.setProps({ metaJson: "META2", changelogsJson: "CH2" });
    await nextTick();

    const metaEmits = wrapper.emitted("update:meta-json");
    expect(metaEmits).toBeTruthy();
    expect(metaEmits![metaEmits!.length - 1]![0]).toBe("META2");

    const chEmits = wrapper.emitted("update:changelogs-json");
    expect(chEmits).toBeTruthy();
    expect(chEmits![chEmits!.length - 1]![0]).toBe("CH2");
  });

  it("comments filtering: leitet gefilterte Listen an Children weiter", () => {
    const comments: CommentItem[] = [
      { type: "metadata_package" as CommentType, fileName: "a", line: 1, body: "m", id: "", author: "", createdAt: "", resolved: false, threadId: "" },
      { type: "changelogs" as CommentType, fileName: "b", line: 2, body: "c", id: "", author: "", createdAt: "", resolved: false, threadId: "" },
      { type: "package_markdown" as CommentType, fileName: "c", line: 3, body: "p", id: "", author: "", createdAt: "", resolved: false, threadId: "" },
      { type: "template_markdown" as CommentType, fileName: "t", line: 4, body: "t1", id: "", author: "", createdAt: "", resolved: false, threadId: "" },
      { type: "update_index_url_version" as CommentType, fileName: "u", line: 5, body: "t2", id: "", author: "", createdAt: "", resolved: false, threadId: "" },
      { type: "other" as any, fileName: "x", line: 6, body: "x", id: "", author: "", createdAt: "", resolved: false, threadId: "" },
    ];

    const wrapper = mountWithProps({ comments });

    const meta = wrapper.findComponent(MetaJsonStub);
    const metaComments = meta.props("comments") as any[];
    expect(metaComments.length).toBe(1);
    expect(metaComments[0].type).toBe("metadata_package");

    const ch = wrapper.findComponent(ChangelogJsonStub);
    const chComments = ch.props("comments") as any[];
    expect(chComments.length).toBe(1);
    expect(chComments[0].type).toBe("changelogs");

    const tmpl = wrapper.findComponent(TemplateMarkdownsSectionStub);
    const tmplComments = tmpl.props("comments") as any[];
    expect(tmplComments.map((x) => x.type).sort()).toEqual(
      ["template_markdown", "update_index_url_version"].sort()
    );
  });

  it("canWrite computed: props.canWriteComments => wird an Children weitergereicht", async () => {
    const wrapper = mountWithProps({ canWriteComments: true });

    const tmpl = wrapper.findComponent(TemplateMarkdownsSectionStub);
    expect(tmpl.props("canWrite")).toBe(true);

    const editors = wrapper.findAllComponents(MarkdownEditorStub);
    expect(editors.length).toBe(5);
    expect(editors[0]?.props("canWrite")).toBe(true);
  });

  it("addCommentFn/replyToThreadFn: ohne props -> resolved Promise, mit props -> delegate", async () => {
    const addComment = vi.fn().mockResolvedValue(undefined);
    const replyToThread = vi.fn().mockResolvedValue(undefined);

    const wrapper = mountWithProps({
      addComment,
      replyToThread,
      canWriteComments: true,
    });

    // @ts-ignore
    await wrapper.vm.addCommentFn({ fileName: "f", type: "package_markdown", line: 1, body: "x" });
    expect(addComment).toHaveBeenCalledTimes(1);

    // @ts-ignore
    await wrapper.vm.replyToThreadFn({ threadId: "t1", body: "r", resolved: false });
    expect(replyToThread).toHaveBeenCalledTimes(1);
  });

  it("TemplateMarkdownsSection events werden korrekt weitergeleitet (update/remove/add)", async () => {
    const wrapper = mountWithProps();

    await wrapper.find('[data-testid="tmpl-add"]').trigger("click");
    expect(wrapper.emitted("add-template-markdown")).toBeTruthy();

    await wrapper.find('[data-testid="tmpl-remove"]').trigger("click");
    const rem = wrapper.emitted("remove-template-markdown");
    expect(rem).toBeTruthy();
    expect(rem![0]![0]).toBe(0);

    await wrapper.find('[data-testid="tmpl-update"]').trigger("click");
    const upd = wrapper.emitted("update:template-markdown");
    expect(upd).toBeTruthy();
    expect(upd![0]![0]).toEqual({ index: 0, canonicalUrl: "x.md", value: "hi" });

    await wrapper.find('[data-testid="tmpl-valid"]').trigger("click");
    const valid = wrapper.emitted("template-markdown-valid");
    expect(valid).toBeTruthy();
    expect(valid![0]![0]).toBe(false);
  });
});
