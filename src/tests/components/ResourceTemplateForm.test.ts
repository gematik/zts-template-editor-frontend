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
import { defineComponent, nextTick } from "vue";
import ResourceTemplateForm from "../../components/ResourceTemplateForm.vue";

let validateReturn: Record<string, string | null> = {};

vi.mock("../../validation/rules", () => ({
  validateResourceTemplate: (form: any) => {
    void form;
    return validateReturn;
  },
}));

const FieldCommentsStub = {
  name: "FieldComments",
  props: [
    "fileName",
    "type",
    "line",
    "comments",
    "canWrite",
    "addComment",
    "replyToThread",
    "fieldKey",
  ],
  template: `
    <button
      class="field-comments-stub"
      data-test="field-comments-add"
      type="button"
      @click="onAdd"
    >
      add-comment
    </button>
  `,
  methods: {
    async onAdd() {
      if (typeof (this as any).addComment === "function") {
        await (this as any).addComment({
          fileName: (this as any).fileName ?? "file",
          type: (this as any).type ?? "template",
          line: (this as any).line ?? 1,
          body: "hello",
        });
      }
    },
  },
};

const ContactDetailListStub = defineComponent({
  name: "ContactDetailList",
  props: [
    "title",
    "items",
    "disabled",
    "fileName",
    "type",
    "comments",
    "canWrite",
    "addComment",
    "replyToThread",
    "itemLineMap",
    "telecomLineMap",
  ],
  emits: ["update:items"],
  setup(_, { emit }) {
    function emitUpdate() {
      emit("update:items", [
        { name: "New Person", telecom: [{ system: "email", value: "a@b.de" }] },
      ]);
    }
    return { emitUpdate };
  },
  template: `
    <div class="contact-detail-list-stub">
      <div data-test="cdl-title">{{ title }}</div>
      <div data-test="cdl-count">{{ (items || []).length }}</div>
      <button data-test="cdl-emit-update" type="button" @click="emitUpdate" :disabled="disabled">
        emit-update
      </button>
    </div>
  `,
});

function lastUpdateJson(wrapper: any): any {
  const updateEmits = wrapper.emitted("update:modelValue");
  expect(updateEmits).toBeTruthy();
  const last = updateEmits![updateEmits!.length - 1]![0] as string;
  return JSON.parse(last);
}

describe("ResourceTemplateForm.vue (updated)", () => {
  beforeEach(() => {
    validateReturn = {};
    vi.restoreAllMocks();
  });

  it("initialisiert aus modelValue (inkl. extension effectivePeriod + artifactAuthors) und emittiert Preview-JSON", async () => {
    const initial = {
      resourceType: "ValueSet",
      language: "de",
      url: "https://example.org",
      version: "1.0.0",
      name: "MyFile",
      title: "Titel",
      date: "2024-05-01",
      publisher: "Pub",
      description: "Desc",
      identifier: [{ use: "official", system: "sys", value: "val" }],
      property: [
        { code: "c1", uri: "", description: "d1", type: "t1" },
      ],
      contact: [{ name: "Kontakt", telecom: [{ system: "phone", value: "123" }] }],
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/resource-effectivePeriod",
          valuePeriod: { start: "2024-01-01", end: "2024-12-31" },
        },
        {
          url: "http://hl7.org/fhir/StructureDefinition/artifact-author",
          valueContactDetail: {
            name: "Autor 1",
            telecom: [{ system: "email", value: "x@y.z" }],
          },
        },
      ],
    };

    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: JSON.stringify(initial), templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    const out = lastUpdateJson(wrapper);

    expect(out.resourceType).toBe("ValueSet");
    expect(out.language).toBe("de");
    expect(out.url).toBe("https://example.org");
    expect(out.version).toBe("1.0.0");
    expect(out.name).toBe("MyFile");
    expect(out.title).toBe("Titel");
    expect(out.date).toBe("2024-05-01");
    expect(out.publisher).toBe("Pub");
    expect(out.description).toBe("Desc");

    expect(Array.isArray(out.extension)).toBe(true);
    const eff = out.extension.find(
      (x: any) =>
        x?.url === "http://hl7.org/fhir/StructureDefinition/resource-effectivePeriod"
    );
    expect(eff?.valuePeriod?.start).toBe("2024-01-01");
    expect(eff?.valuePeriod?.end).toBe("2024-12-31");

    const authors = out.extension.filter(
      (x: any) => x?.url === "http://hl7.org/fhir/StructureDefinition/artifact-author"
    );
    expect(authors.length).toBe(1);
    expect(authors[0]?.valueContactDetail?.name).toBe("Autor 1");

    expect(out.identifier).toEqual([{ use: "official", system: "sys", value: "val" }]);

    expect(out.property?.[0]?.code).toBe("c1");
    expect(out.property?.[0]?.description).toBe("d1");
    expect(out.property?.[0]?.type).toBe("t1");
    expect(Object.prototype.hasOwnProperty.call(out.property?.[0] ?? {}, "uri")).toBe(false);

    expect(out.contact?.[0]?.name).toBe("Kontakt");
    expect(out.contact?.[0]?.telecom?.[0]?.system).toBe("phone");
    expect(out.contact?.[0]?.telecom?.[0]?.value).toBe("123");
  });

  it("fällt bei kaputtem JSON auf Defaults zurück (parseModel catch-Branch)", async () => {
    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: "not-json", templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    const out = lastUpdateJson(wrapper);

    expect(out).toEqual({
      resourceType: "CodeSystem",
      language: "de",
    });
  });

  it("emittiert keine leeren ResourceTemplate-Felder", async () => {
    const wrapper = mount(ResourceTemplateForm, {
      props: {
        modelValue: JSON.stringify({
          resourceType: "CodeSystem",
          language: "",
          url: "https://example.org/fhir/CodeSystem/x",
          identifier: [{ use: "", system: "", value: "" }],
          property: [{ code: "", uri: "", description: "", type: "" }],
          contact: [{ name: "", telecom: [{ system: "", value: "" }] }],
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/resource-effectivePeriod",
              valuePeriod: { start: "", end: "" },
            },
          ],
        }),
        templateName: "test.json",
      },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    expect(lastUpdateJson(wrapper)).toEqual({
      resourceType: "CodeSystem",
      url: "https://example.org/fhir/CodeSystem/x",
    });
  });

  it("zeigt lokale FHIR-Fehler (language/url/date/effectivePeriod) und emittiert valid=false", async () => {
    validateReturn = {};

    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: JSON.stringify({}), templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    const languageRow = wrapper.findAll("div").find(d => d.text().includes("language"))!;
    expect(languageRow).toBeTruthy();

    const langInput = languageRow.find('input[type="text"]');
    expect(langInput.exists()).toBe(true);

    await langInput.setValue("ddd de  DE");
    await langInput.trigger("input");
    await nextTick();

    expect(wrapper.text()).toContain("FHIR: language muss code sein");


    const urlInput = wrapper
      .findAll('input[type="text"]')
      .find((x) => {
        const p = x.attributes("pattern") ?? "";
        const ph = x.attributes("placeholder");
        return p.includes("\\S") && !ph;
      });
    expect(urlInput).toBeTruthy();

    await urlInput!.setValue("https://ex ample.org");
    await nextTick();
    expect(wrapper.text()).toContain("FHIR: url darf keine Whitespaces enthalten");

    const fhirDateInputs = wrapper.findAll('input[type="text"][pattern^="^([0-9]"]');
    expect(fhirDateInputs.length).toBeGreaterThanOrEqual(3);

    await fhirDateInputs[0]!.setValue("2024-13-40");
    await fhirDateInputs[1]!.setValue("2024-13-40");
    await fhirDateInputs[2]!.setValue("2024-13-40");
    await nextTick();

    expect(wrapper.text()).toContain("FHIR: start ist ungültig");
    expect(wrapper.text()).toContain("FHIR: end ist ungültig");
    expect(wrapper.text()).toContain("FHIR: date ist ungültig");

    const validEmits = wrapper.emitted("valid");
    expect(validEmits).toBeTruthy();
    expect(validEmits![validEmits!.length - 1]![0]).toBe(false);
  });

  it("add/remove Identifier und remove-Guard (<=1 verhindert Entfernen)", async () => {
    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: JSON.stringify({}), templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    let removeBtns = wrapper.findAll('button[type="button"]').filter((b) => b.text().includes("✕"));
    expect(removeBtns.length).toBeGreaterThan(0);

    const outBefore = lastUpdateJson(wrapper);
    expect(outBefore.identifier).toBeUndefined();
    await removeBtns[0]!.trigger("click");
    await nextTick();
    const outAfterGuard = lastUpdateJson(wrapper);
    expect(outAfterGuard.identifier).toBeUndefined();

    const addIdentifierBtn = wrapper
      .findAll('button[type="button"]')
      .find((b) => b.text().includes("+ Add Identifier"));
    expect(addIdentifierBtn).toBeTruthy();

    await addIdentifierBtn!.trigger("click");
    await nextTick();

    const outAfterAdd = lastUpdateJson(wrapper);
    expect(outAfterAdd.identifier).toBeUndefined();

    removeBtns = wrapper.findAll('button[type="button"]').filter((b) => b.text().includes("✕"));
    await removeBtns[0]!.trigger("click");
    await nextTick();

    const outAfterRemove = lastUpdateJson(wrapper);
    expect(outAfterRemove.identifier).toBeUndefined();
  });

  it("add/remove Property + Branch: uri nur wenn nicht leer", async () => {
    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: JSON.stringify({}), templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    let out = lastUpdateJson(wrapper);
    expect(out.property).toBeUndefined();

    const uriInput = wrapper.find('input[placeholder="uri (optional)"]');
    expect(uriInput.exists()).toBe(true);
    await uriInput.setValue("");
    await nextTick();

    out = lastUpdateJson(wrapper);
    expect(out.property).toBeUndefined();

    // Setze uri gesetzt => muss im JSON stehen
    await uriInput.setValue("http://example.org/u");
    await nextTick();

    out = lastUpdateJson(wrapper);
    expect(out.property[0].uri).toBe("http://example.org/u");

    // Add Property
    const addPropertyBtn = wrapper
      .findAll('button[type="button"]')
      .find((b) => b.text().includes("+ Add Property"));
    expect(addPropertyBtn).toBeTruthy();

    await addPropertyBtn!.trigger("click");
    await nextTick();

    out = lastUpdateJson(wrapper);
    expect(out.property.length).toBe(1);

    const removeBtns = wrapper.findAll('button[type="button"]').filter((b) => b.text().includes("✕"));
    await removeBtns[removeBtns.length - 1]!.trigger("click");
    await nextTick();

    out = lastUpdateJson(wrapper);
    expect(out.property.length).toBe(1);
  });

  it("nimmt update:items von ContactDetailList an (setContacts + setAuthors) und emittiert Update", async () => {
    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: JSON.stringify({ name: "FileX" }), templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    const lists = wrapper.findAllComponents({ name: "ContactDetailList" });
    expect(lists.length).toBe(2);

    await lists[0]!.find('[data-test="cdl-emit-update"]').trigger("click");
    await nextTick();

    let out = lastUpdateJson(wrapper);
    expect(out.contact?.[0]?.name).toBe("New Person");

    await lists[1]!.find('[data-test="cdl-emit-update"]').trigger("click");
    await nextTick();

    out = lastUpdateJson(wrapper);
    const authors = out.extension.filter(
      (x: any) => x?.url === "http://hl7.org/fhir/StructureDefinition/artifact-author"
    );
    expect(authors.length).toBeGreaterThan(0);
    expect(authors[0]?.valueContactDetail?.name).toBe("New Person");
  });

  it("disabled/locked deaktiviert Inputs/Select/Add-Buttons", async () => {
    const wrapper = mount(ResourceTemplateForm, {
      props: { modelValue: JSON.stringify({}), disabled: true, templateName: "test.json" },
      global: {
        stubs: {
          FieldComments: FieldCommentsStub,
          ContactDetailList: ContactDetailListStub,
        },
      },
    });

    await nextTick();

    const select = wrapper.find("select");
    expect((select.element as HTMLSelectElement).disabled).toBe(true);

    const someInput = wrapper.find('input[type="text"]');
    expect((someInput.element as HTMLInputElement).disabled).toBe(true);

    const addIdentifierBtn = wrapper
      .findAll('button[type="button"]')
      .find((b) => b.text().includes("+ Add Identifier"));
    const addPropertyBtn = wrapper
      .findAll('button[type="button"]')
      .find((b) => b.text().includes("+ Add Property"));

    expect(addIdentifierBtn).toBeTruthy();
    expect(addPropertyBtn).toBeTruthy();
    expect((addIdentifierBtn!.element as HTMLButtonElement).disabled).toBe(true);
    expect((addPropertyBtn!.element as HTMLButtonElement).disabled).toBe(true);

    const lists = wrapper.findAllComponents({ name: "ContactDetailList" });
    expect((lists[0]!.find('[data-test="cdl-emit-update"]').element as HTMLButtonElement).disabled).toBe(true);
  });

  it("addCommentFn: guard wenn props.addComment fehlt + call wenn vorhanden", async () => {
    const w1 = mount(ResourceTemplateForm, {
      props: {
        modelValue: JSON.stringify({ name: "File1" }),
        templateName: "test.json"
      },
      global: { stubs: { FieldComments: FieldCommentsStub, ContactDetailList: ContactDetailListStub } },
    });
    await nextTick();
    await w1.find('[data-test="field-comments-add"]').trigger("click");
    await nextTick();

    const addComment = vi.fn().mockResolvedValue(undefined);

    const w2 = mount(ResourceTemplateForm, {
      props: {
        modelValue: JSON.stringify({ name: "File2" }),
        templateName: "test.json",
        canWriteComments: true,
        addComment,
      },
      global: { stubs: { FieldComments: FieldCommentsStub, ContactDetailList: ContactDetailListStub } },
    });

    await nextTick();
    await w2.find('[data-test="field-comments-add"]').trigger("click");
    await nextTick();

    expect(addComment).toHaveBeenCalledTimes(1);
    const arg = addComment.mock.calls[0]![0];
    expect(arg).toMatchObject({
      fileName: "test.json",
      type: "template",
    });
    expect(typeof arg.line).toBe("number");
    expect(arg.body).toBe("hello");
  });
});
