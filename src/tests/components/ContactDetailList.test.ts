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

import ContactDetailList from "../../components/ContactDetailList.vue";

type TelecomItem = { system: string; value: string };
type ContactDetail = { name: string; telecom: TelecomItem[] };

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
  template: `<div class="field-comments-stub"
    :data-field-key="fieldKey"
    :data-line="line"
  />`,
};

function mountComp(
  overrides: Partial<InstanceType<typeof ContactDetailList>["$props"]> = {}
) {
  const addComment = vi.fn().mockResolvedValue(undefined);
  const replyToThread = vi.fn().mockResolvedValue(undefined);

  const props = {
    title: "Contact",
    items: [
      { name: "Alice", telecom: [{ system: "email", value: "a@b.de" }] },
    ] as ContactDetail[],
    disabled: false,

    fileName: "file.json",
    type: "contact" as any,
    comments: [],
    canWrite: true,
    addComment,
    replyToThread,

    itemLineMap: [10],
    telecomLineMap: [[20]],

    ...overrides,
  };

  const wrapper = mount(ContactDetailList as any, {
    props,
    global: {
      stubs: {
        FieldComments: FieldCommentsStub,
      },
    },
  });

  return { wrapper, addComment, replyToThread };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ContactDetailList.vue", () => {
  it("rendert Titel, ein Item und Inputs", () => {
    const { wrapper } = mountComp();

    expect(wrapper.text()).toContain("Contact");

    const inputs = wrapper.findAll("input[type='text']");

    // name + system + value = 3
    expect(inputs.length).toBe(3);

    expect((inputs[0]!.element as HTMLInputElement).value).toBe("Alice");
    expect((inputs[1]!.element as HTMLInputElement).value).toBe("email");
    expect((inputs[2]!.element as HTMLInputElement).value).toBe("a@b.de");
  });

  it("rendert keinen leeren Telecom-Input, wenn telecom leer ist", () => {
    const { wrapper } = mountComp({
      items: [{ name: "Alice", telecom: [] }],
      itemLineMap: [10],
      telecomLineMap: [[]],
    });

    const inputs = wrapper.findAll("input[type='text']");

    // nur name, keine system/value Inputs
    expect(inputs.length).toBe(1);
    expect((inputs[0]!.element as HTMLInputElement).value).toBe("Alice");

    expect(wrapper.text()).toContain("Keine Telecom-Einträge.");
  });

  it("Add Item: emittiert update:items mit zusätzlichem leeren Item ohne telecom", async () => {
    const { wrapper } = mountComp();

    const addBtn = wrapper.find("button");
    expect(addBtn.text()).toContain("+ Add");

    await addBtn.trigger("click");

    const emits = wrapper.emitted("update:items");
    expect(emits).toBeTruthy();

    const last = emits![emits!.length - 1]!;
    const payload = last[0] as ContactDetail[];

    expect(payload.length).toBe(2);
    expect(payload[1]).toEqual({ name: "", telecom: [] });
  });

  it("Remove Item: bei nur 1 Item => emittiert leere Liste", async () => {
    const { wrapper } = mountComp({
      items: [{ name: "Solo", telecom: [] }],
      itemLineMap: [1],
      telecomLineMap: [[]],
    });

    const removeBtn = wrapper
      .findAll("button")
      .find((b) => b.text().trim() === "✕")!;

    expect(removeBtn.attributes("disabled")).toBeUndefined();

    await removeBtn.trigger("click");

    const emits = wrapper.emitted("update:items");
    expect(emits).toBeTruthy();

    const payload = emits![emits!.length - 1]![0] as ContactDetail[];
    expect(payload).toEqual([]);
  });

  it("Remove Item: bei 2 Items => emittiert update:items mit 1 Item weniger", async () => {
    const { wrapper } = mountComp({
      items: [
        { name: "A", telecom: [{ system: "email", value: "a@a" }] },
        { name: "B", telecom: [{ system: "url", value: "x" }] },
      ],
      itemLineMap: [10, 11],
      telecomLineMap: [[20], [21]],
    });

    const removeBtns = wrapper
      .findAll("button")
      .filter((b) => b.text().trim() === "✕");

    expect(removeBtns.length).toBeGreaterThanOrEqual(2);

    await removeBtns[0]!.trigger("click");

    const emits = wrapper.emitted("update:items")!;
    const payload = emits[emits.length - 1]![0] as ContactDetail[];

    expect(payload.length).toBe(1);
    expect(payload[0]!.name).toBe("B");
  });

  it("updateName: input ändert name und emittiert update:items; telecom bleibt leer", async () => {
    const { wrapper } = mountComp({
      items: [{ name: "Old", telecom: [] }],
      itemLineMap: [1],
      telecomLineMap: [[]],
    });

    const nameInput = wrapper.findAll("input[type='text']")[0]!;
    await nameInput.setValue("NewName");

    const emits = wrapper.emitted("update:items")!;
    const payload = emits[emits.length - 1]![0] as ContactDetail[];

    expect(payload[0]!.name).toBe("NewName");
    expect(payload[0]!.telecom).toEqual([]);
  });

  it("Add Telecom: emittiert update:items mit zusätzlichem telecom", async () => {
    const { wrapper } = mountComp();

    const addTelecomBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("+ Add Telecom"))!;

    await addTelecomBtn.trigger("click");

    const emits = wrapper.emitted("update:items")!;
    const payload = emits[emits.length - 1]![0] as ContactDetail[];

    expect(payload[0]!.telecom.length).toBe(2);
    expect(payload[0]!.telecom[1]).toEqual({ system: "", value: "" });
  });

  it("Add Telecom: funktioniert auch wenn telecom vorher leer ist", async () => {
    const { wrapper } = mountComp({
      items: [{ name: "A", telecom: [] }],
      itemLineMap: [1],
      telecomLineMap: [[]],
    });

    const addTelecomBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("+ Add Telecom"))!;

    await addTelecomBtn.trigger("click");

    const emits = wrapper.emitted("update:items")!;
    const payload = emits[emits.length - 1]![0] as ContactDetail[];

    expect(payload[0]!.telecom).toEqual([{ system: "", value: "" }]);
  });

  it("Remove Telecom: bei nur 1 telecom => emittiert telecom: []", async () => {
    const { wrapper } = mountComp({
      items: [{ name: "A", telecom: [{ system: "email", value: "x" }] }],
      itemLineMap: [1],
      telecomLineMap: [[2]],
    });

    const telecomRemoveBtn = wrapper
      .findAll("button")
      .filter((b) => b.text().trim() === "✕")[1]!;

    expect(telecomRemoveBtn.attributes("disabled")).toBeUndefined();

    await telecomRemoveBtn.trigger("click");

    const emits = wrapper.emitted("update:items");
    expect(emits).toBeTruthy();

    const payload = emits![emits!.length - 1]![0] as ContactDetail[];
    expect(payload[0]!.telecom).toEqual([]);
  });

  it("updateTelecom: ändert system und value", async () => {
    const { wrapper } = mountComp({
      items: [{ name: "A", telecom: [{ system: "email", value: "x" }] }],
      itemLineMap: [1],
      telecomLineMap: [[2]],
    });

    const inputs = wrapper.findAll("input[type='text']");

    await inputs[1]!.setValue("url");

    let emits = wrapper.emitted("update:items")!;
    let payload = emits[emits.length - 1]![0] as ContactDetail[];

    expect(payload[0]!.telecom[0]!.system).toBe("url");
    expect(payload[0]!.telecom[0]!.value).toBe("x");

    await inputs[2]!.setValue("https://example.org");

    emits = wrapper.emitted("update:items")!;
    payload = emits[emits.length - 1]![0] as ContactDetail[];

    expect(payload[0]!.telecom[0]!.system).toBe("email");
    expect(payload[0]!.telecom[0]!.value).toBe("https://example.org");
  });

  it("disabled=true: alle relevanten Buttons/Inputs disabled", () => {
    const { wrapper } = mountComp({ disabled: true });

    const buttons = wrapper.findAll("button");
    for (const b of buttons) {
      expect(b.attributes("disabled")).toBeDefined();
    }

    const inputs = wrapper.findAll("input");
    for (const i of inputs) {
      expect(i.attributes("disabled")).toBeDefined();
    }
  });

  it("FieldComments bekommt fieldKey + line aus itemLineMap/telecomLineMap", () => {
    const { wrapper } = mountComp({
      title: "Contact",
      itemLineMap: [123],
      telecomLineMap: [[456]],
    });

    const fc = wrapper.findAll(".field-comments-stub");
    expect(fc.length).toBe(2);

    const itemFc = fc[0]!;
    const telFc = fc[1]!;

    expect(itemFc.attributes("data-field-key")).toBe("Contact[0]");
    expect(itemFc.attributes("data-line")).toBe("123");

    expect(telFc.attributes("data-field-key")).toBe("Contact[0].telecom[0]");
    expect(telFc.attributes("data-line")).toBe("456");
  });

  it("Line fallback: wenn Maps fehlen => line=1", () => {
    const { wrapper } = mountComp({
      itemLineMap: [],
      telecomLineMap: [],
    });

    const fc = wrapper.findAll(".field-comments-stub");
    expect(fc.length).toBe(2);

    expect(fc[0]!.attributes("data-line")).toBe("1");
    expect(fc[1]!.attributes("data-line")).toBe("1");
  });

  it("Line fallback: bei leerer telecom-Liste gibt es nur Item-FieldComments", () => {
    const { wrapper } = mountComp({
      items: [{ name: "A", telecom: [] }],
      itemLineMap: [],
      telecomLineMap: [],
    });

    const fc = wrapper.findAll(".field-comments-stub");

    expect(fc.length).toBe(1);
    expect(fc[0]!.attributes("data-field-key")).toBe("Contact[0]");
    expect(fc[0]!.attributes("data-line")).toBe("1");
  });
});
