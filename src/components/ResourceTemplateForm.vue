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
import { reactive, watch, computed } from "vue";
import { validateResourceTemplate } from "../validation/rules";
import type { CommentItem, CommentType } from "../types";
import FieldComments from "./FieldComments.vue";
import ContactDetailList from "./ContactDetailList.vue";

const EXT_URL_EFFECTIVE_PERIOD =
  "http://hl7.org/fhir/StructureDefinition/resource-effectivePeriod"; // NOSONAR
const EXT_URL_ARTIFACT_AUTHOR =
  "http://hl7.org/fhir/StructureDefinition/artifact-author"; // NOSONAR
const EXT_URL_LAST_REVIEW_DATE =
  "http://hl7.org/fhir/StructureDefinition/resource-lastReviewDate"; // NOSONAR

const FHIR_RE = {
  date:
    /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)?$/,
  code: /^[^\s]+( [^\s]+)*$/,
  uri: /^\S*$/,
};

type IdentifierItem = { use: string; system: string; value: string };
type TelecomItem = { system: string; value: string };
type ContactDetail = { name: string; telecom: TelecomItem[] };

const props = withDefaults(
  defineProps<{
    modelValue: string;
    templateName: string;
    disabled?: boolean;
    locked?: boolean;

    comments?: CommentItem[];
    canWriteComments?: boolean;
    addComment?: (p: {
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
  }>(),
  {
    disabled: false,
    locked: false,
    comments: () => [],
    canWriteComments: false,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
  (e: "valid", v: boolean): void;
}>();

const locked = computed(() => !!props.disabled || !!props.locked);
const commentType = "template" as CommentType;

const commentsList = computed<CommentItem[]>(() =>
  Array.isArray(props.comments) ? props.comments : []
);
const canWrite = computed(() => !!props.canWriteComments);

const addCommentFn = async (p: {
  fileName: string;
  type: CommentType;
  line: number;
  body: string;
}) => {
  if (!props.addComment) return;
  await props.addComment(p);
};

function ensureArray<T>(v: any, fallback: T[]): T[] {
  return Array.isArray(v) ? v : fallback;
}

function emptyTelecom(): TelecomItem {
  return { system: "", value: "" };
}
function emptyContact(): ContactDetail {
  return { name: "", telecom: [emptyTelecom()] };
}
function emptyIdentifier(): IdentifierItem {
  return { use: "", system: "", value: "" };
}

function parseModel(json: string): any {
  try {
    const o = JSON.parse(json || "{}");

    const ext = ensureArray<any>(o.extension, []);
    const eff = ext.find((x: any) => x?.url === EXT_URL_EFFECTIVE_PERIOD) ?? {};
    const effVP = eff?.valuePeriod ?? {};

    const authorsExt = ext.filter((x: any) => x?.url === EXT_URL_ARTIFACT_AUTHOR);
    const authors: ContactDetail[] = authorsExt.map((x: any) => {
      const vcd = x?.valueContactDetail ?? {};
      return {
        name: vcd?.name ?? "",
        telecom: ensureArray<any>(vcd?.telecom, []).map((t: any) => ({
          system: t?.system ?? "",
          value: t?.value ?? "",
        })),
      };
    });

    const lastReviewDateExt = ext.find((x: any) => x?.url === EXT_URL_LAST_REVIEW_DATE);

    const identifier: IdentifierItem[] = ensureArray<any>(o.identifier, []).map((x: any) => ({
      use: x?.use ?? "",
      system: x?.system ?? "",
      value: x?.value ?? "",
    }));

    const property = ensureArray<any>(o.property, []).map((x: any) => ({
      code: x?.code ?? "",
      uri: x?.uri ?? "",
      description: x?.description ?? "",
      type: x?.type ?? "",
    }));

    const contact: ContactDetail[] = ensureArray<any>(o.contact, []).map((c: any) => ({
      name: c?.name ?? "",
      telecom: ensureArray<any>(c?.telecom, []).map((t: any) => ({
        system: t?.system ?? "",
        value: t?.value ?? "",
      })),
    }));

    return {
      version: o.version ?? "",
      resourceType: o.resourceType ?? o.type ?? "CodeSystem",
      url: o.url ?? "",
      title: o.title ?? "",
      publisher: o.publisher ?? "",
      name: o.name ?? "",
      language: o.language ?? "",
      effectivePeriod: {
        start: effVP?.start ?? "",
        end: effVP?.end ?? "",
      },

      artifactAuthors: authors.length ? authors : [emptyContact()],

      identifier: identifier.length ? identifier : [emptyIdentifier()],
      property: property.length ? property : [{ code: "", uri: "", description: "", type: "" }],

      description: o.description ?? "",
      date: o.date ?? "",
      lastReviewDate: lastReviewDateExt?.valueDate ?? "",

      contact: contact.length ? contact : [emptyContact()],
    };
  } catch {
    return {
      version: "",
      resourceType: "CodeSystem",
      url: "",
      title: "",
      publisher: "",
      name: "",
      language: "de",

      effectivePeriod: { start: "", end: "" },
      artifactAuthors: [emptyContact()],

      identifier: [emptyIdentifier()],
      property: [{ code: "", uri: "", description: "", type: "" }],

      description: "",
      date: "",
      lastReviewDate: "",

      contact: [emptyContact()],
    };
  }
}

const form = reactive<any>(parseModel(props.modelValue));
const errors = reactive<Record<string, string | null>>({});

function isEmpty(v: any) {
  return v === null || v === undefined || String(v).trim() === "";
}

function fhirCheck(pattern: RegExp, value: string, msg: string) {
  const normalized = String(value ?? "").trim();
  if (isEmpty(normalized)) return null;
  return pattern.test(normalized) ? null : msg;
}

type PreviewAndLineMaps = {
  json: string;
  lineMapFields: Record<string, number>;
  identifierLineMap: number[];
  propertyLineMap: number[];
  contactLineMap: number[];
  contactTelecomLineMap: number[][];
  authorLineMap: number[];
  authorTelecomLineMap: number[][];
};

type JsonObject = Record<string, any>;

function cleanString(value: any): string {
  return String(value ?? "").trim();
}


function cleanObject<T extends JsonObject>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    })
  ) as Partial<T>;
}

function cleanTelecomList(items: TelecomItem[] | undefined): JsonObject[] {
  return ensureArray<TelecomItem>(items, [])
    .map((t) =>
      cleanObject({
        system: cleanString(t?.system),
        value: cleanString(t?.value),
      })
    )
    .filter((t) => Object.keys(t).length > 0);
}

function cleanContactDetail(contact: ContactDetail | undefined): JsonObject | null {
  const telecom = cleanTelecomList(contact?.telecom);
  const out = cleanObject({
    name: cleanString(contact?.name),
    telecom,
  });

  return Object.keys(out).length > 0 ? out : null;
}

function buildResourceTemplateJson(input: any): JsonObject {
  const out: JsonObject = {
    resourceType: cleanString(input.resourceType) || "CodeSystem",
  };

  const language = cleanString(input.language);
  if (language) out.language = language;

  const extensions: JsonObject[] = [];
  const effectivePeriod = cleanObject({
    start: cleanString(input?.effectivePeriod?.start),
    end: cleanString(input?.effectivePeriod?.end),
  });

  if (Object.keys(effectivePeriod).length > 0) {
    extensions.push({
      url: EXT_URL_EFFECTIVE_PERIOD,
      valuePeriod: effectivePeriod,
    });
  }

  const lastReviewDate = cleanString(input.lastReviewDate);
  
  if (lastReviewDate) {
    extensions.push({
      url: EXT_URL_LAST_REVIEW_DATE,
      valueDate: lastReviewDate,
    });
  }

  const authors = ensureArray<ContactDetail>(input.artifactAuthors, [])
    .map(cleanContactDetail)
    .filter((author): author is JsonObject => author !== null);

  for (const author of authors) {
    extensions.push({
      url: EXT_URL_ARTIFACT_AUTHOR,
      valueContactDetail: author,
    });
  }

  if (extensions.length > 0) out.extension = extensions;

  const url = cleanString(input.url);
  if (url) out.url = url;

  const identifier = ensureArray<IdentifierItem>(input.identifier, [])
    .map((id) =>
      cleanObject({
        use: cleanString(id?.use),
        system: cleanString(id?.system),
        value: cleanString(id?.value),
      })
    )
    .filter((id) => Object.keys(id).length > 0);
  if (identifier.length > 0) out.identifier = identifier;

  const version = cleanString(input.version);
  if (version) out.version = version;

  const name = cleanString(input.name);
  if (name) out.name = name;

  const title = cleanString(input.title);
  if (title) out.title = title;

  const date = cleanString(input.date);
  if (date) out.date = date;

  const publisher = cleanString(input.publisher);
  if (publisher) out.publisher = publisher;

  const contact = ensureArray<ContactDetail>(input.contact, [])
    .map(cleanContactDetail)
    .filter((item): item is JsonObject => item !== null);
  if (contact.length > 0) out.contact = contact;

  const description = cleanString(input.description);
  if (description) out.description = description;

  const property = ensureArray<any>(input.property, [])
    .map((p) =>
      cleanObject({
        code: cleanString(p?.code),
        uri: cleanString(p?.uri),
        description: cleanString(p?.description),
        type: cleanString(p?.type),
      })
    )
    .filter((p) => Object.keys(p).length > 0);
  if (property.length > 0) out.property = property;

  return out;
}

function findLine(json: string, matcher: string | RegExp, fallback = 1): number {
  const lines = json.split("\n");
  const idx = lines.findIndex((line) =>
    typeof matcher === "string" ? line.includes(matcher) : matcher.test(line)
  );
  return idx >= 0 ? idx + 1 : fallback;
}

function findNthLine(json: string, matcher: string | RegExp, occurrence: number, fallback = 1): number {
  const lines = json.split("\n");
  let seen = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const matches = typeof matcher === "string" ? lines[index]!.includes(matcher) : matcher.test(lines[index]!);
    if (!matches) continue;
    if (seen === occurrence) return index + 1;
    seen += 1;
  }

  return fallback;
}

function findArrayItemLine(json: string, fieldName: string, occurrence: number, fallback = 1): number {
  const lines = json.split("\n");
  const fieldLine = lines.findIndex((line) => line.includes(`"${fieldName}"`));
  if (fieldLine < 0) return fallback;

  let seen = 0;
  for (let index = fieldLine + 1; index < lines.length; index += 1) {
    if (/^  \]/.test(lines[index]!)) break;
    if (!/^    \{/.test(lines[index]!)) continue;
    if (seen === occurrence) return index + 1;
    seen += 1;
  }

  return fallback;
}

function buildPreviewAndLineMaps(input: any): PreviewAndLineMaps {
  const out = buildResourceTemplateJson(input);
  const json = JSON.stringify(out, null, 2);

  const lineMapFields: Record<string, number> = {
    resourceType: findLine(json, '"resourceType"'),
    language: findLine(json, '"language"'),
    extension: findLine(json, '"extension"'),
    url: findLine(json, '"url"'),
    identifier: findLine(json, '"identifier"'),
    version: findLine(json, '"version"'),
    name: findLine(json, '"name"'),
    title: findLine(json, '"title"'),
    date: findLine(json, '"date"'),
    publisher: findLine(json, '"publisher"'),
    contact: findLine(json, '"contact"'),
    lastReviewDate: findLine(json, EXT_URL_LAST_REVIEW_DATE),
    description: findLine(json, '"description"'),
    property: findLine(json, '"property"'),
    "effectivePeriod.start": findLine(json, '"start"'),
    "effectivePeriod.end": findLine(json, '"end"'),
  };

  const identifierLineMap = ensureArray<any>(out.identifier, []).map((_, idx) =>
    findArrayItemLine(json, "identifier", idx, lineMapFields.identifier)
  );

  const propertyLineMap = ensureArray<any>(out.property, []).map((_, idx) =>
    findArrayItemLine(json, "property", idx, lineMapFields.property)
  );

  const contactItems = ensureArray<any>(out.contact, []);
  const contactLineMap = contactItems.map((_, idx) =>
    findArrayItemLine(json, "contact", idx, lineMapFields.contact)
  );
  const contactTelecomLineMap = contactItems.map((contact) =>
    ensureArray<any>(contact.telecom, []).map((_, idx) =>
      findNthLine(json, '"telecom"', idx, lineMapFields.contact)
    )
  );

  const authorItems = ensureArray<any>(out.extension, []).filter(
    (ext) => ext?.url === EXT_URL_ARTIFACT_AUTHOR
  );
  const authorLineMap = authorItems.map((_, idx) =>
    findNthLine(json, EXT_URL_ARTIFACT_AUTHOR, idx, lineMapFields.extension)
  );
  const authorTelecomLineMap = authorItems.map((author) =>
    ensureArray<any>(author?.valueContactDetail?.telecom, []).map((_, idx) =>
      findNthLine(json, '"telecom"', idx, lineMapFields.extension)
    )
  );

  return {
    json,
    lineMapFields,
    identifierLineMap,
    propertyLineMap,
    contactLineMap,
    contactTelecomLineMap,
    authorLineMap,
    authorTelecomLineMap,
  };
}

const preview = computed(() => buildPreviewAndLineMaps(form));
const jsonPreview = computed(() => preview.value.json);

function validateAndEmit() {
  const e = validateResourceTemplate(form);

  const local: Record<string, string | null> = {};
  local["language"] = fhirCheck(FHIR_RE.code, form.language, "FHIR: language muss code sein");
  local["url"] = fhirCheck(FHIR_RE.uri, form.url, "FHIR: url darf keine Whitespaces enthalten");
  local["date"] = fhirCheck(FHIR_RE.date, form.date, "FHIR: date ist ungültig (YYYY, YYYY-MM oder YYYY-MM-DD)");
  local["effectivePeriod.start"] = fhirCheck(
    FHIR_RE.date,
    form.effectivePeriod?.start ?? "",
    "FHIR: start ist ungültig (YYYY, YYYY-MM oder YYYY-MM-DD)"
  );
  local["effectivePeriod.end"] = fhirCheck(
    FHIR_RE.date,
    form.effectivePeriod?.end ?? "",
    "FHIR: end ist ungültig (YYYY, YYYY-MM oder YYYY-MM-DD)"
  );
  local["lastReviewDate"] = fhirCheck(FHIR_RE.date, form.lastReviewDate, "FHIR: lastReviewDate ist ungültig (YYYY, YYYY-MM oder YYYY-MM-DD)");

  for (const k of Object.keys(errors)) delete (errors as any)[k];
  for (const [k, v] of Object.entries(e)) (errors as any)[k] = v;

  for (const [k, v] of Object.entries(local)) {
    if (v) (errors as any)[k] = v;
  }

  const ok = Object.values(errors).every((x) => !x);
  emit("valid", ok);
  emit("update:modelValue", preview.value.json);
}

function addIdentifier() {
  form.identifier.push(emptyIdentifier());
  validateAndEmit();
}
function removeIdentifier(index: number) {
  if (form.identifier.length <= 1) return;
  form.identifier.splice(index, 1);
  validateAndEmit();
}

function addProperty() {
  form.property.push({ code: "", uri: "", description: "", type: "" });
  validateAndEmit();
}
function removeProperty(index: number) {
  if (form.property.length <= 1) return;
  form.property.splice(index, 1);
  validateAndEmit();
}

function setContacts(v: ContactDetail[]) {
  form.contact = v;
  validateAndEmit();
}
function setAuthors(v: ContactDetail[]) {
  form.artifactAuthors = v;
  validateAndEmit();
}

watch(
  () => props.modelValue,
  (v) => Object.assign(form, parseModel(v)),
  { immediate: true }
);

watch(
  preview,
  () => emit("update:modelValue", preview.value.json),
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow space-y-6">
    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center justify-between gap-2">
        <span class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded">
          resourceType*
        </span>
      </div>

      <div>
        <select
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.resourceType"
          @change="validateAndEmit"
        >
          <option>CodeSystem</option>
          <option>ValueSet</option>
          <option>ConceptMap</option>
        </select>
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="resourceType"
        />
      </div>
    </div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">language</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.language"
          :pattern="FHIR_RE.code.source"
          @input="validateAndEmit"
        />
        <p v-if="errors.language" class="text-red-600 text-sm mt-1">{{ errors.language }}</p>
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="language"
        />
      </div>
    </div>

    <div class="space-y-2">
      <div class="grid grid-cols-[1fr_auto] gap-3 items-center">
    <span class="font-semibold text-gray-800">effectivePeriod</span>

    <div class="flex items-center justify-end">
      <FieldComments
        :file-name="templateName"
        :type="commentType"
        :line=1
        :comments="commentsList"
        :can-write="canWrite"
        :add-comment="addCommentFn"
        :reply-to-thread="props.replyToThread"
        field-key="extension[effectivePeriod]"
      />
    </div>
  </div>

  <div class="grid md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-600" for="effectivePeriodStart">start</label>
      <input
        id="effectivePeriodStart"
        type="text"
        class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
        :disabled="locked"
        v-model="form.effectivePeriod.start"
        :pattern="FHIR_RE.date.source"
        @input="validateAndEmit"
      />
      <p v-if="errors['effectivePeriod.start']" class="text-red-600 text-sm mt-1">
        {{ errors["effectivePeriod.start"] }}
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-600" for="effectivePeriodEnd">end</label>
      <input
        id="effectivePeriodEnd"
        type="text"
        class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
        :disabled="locked"
        v-model="form.effectivePeriod.end"
        :pattern="FHIR_RE.date.source"
        @input="validateAndEmit"
      />
      <p v-if="errors['effectivePeriod.end']" class="text-red-600 text-sm mt-1">
        {{ errors["effectivePeriod.end"] }}
      </p>
    </div>
  </div>
</div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-white bg-primary-bfarm-green px-2 py-1 rounded">url*</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.url"
          :pattern="FHIR_RE.uri.source"
          @input="validateAndEmit"
        />
        <p v-if="errors.url" class="text-red-600 text-sm mt-1">{{ errors.url }}</p>
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="url"
        />
      </div>
    </div>

<div class="space-y-3">
  <span class="block text-sm font-medium text-gray-600">Identifier</span>

  <div v-for="(id, index) in form.identifier" :key="index">
    <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
      <div class="flex gap-2 items-start">
        <label class="sr-only" :for="`identifier-use-${index}`">identifier use {{ Number(index) + 1 }}</label>
        <input
          :id="`identifier-use-${index}`"
          type="text"
          v-model="id.use"
          :disabled="locked"
          placeholder="use"
          class="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          @input="validateAndEmit"
        />

        <label class="sr-only" :for="`identifier-system-${index}`">identifier system {{ Number(index) + 1 }}</label>
        <input
          :id="`identifier-system-${index}`"
          type="text"
          v-model="id.system"
          :disabled="locked"
          placeholder="system"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          :pattern="FHIR_RE.uri.source"
          @input="validateAndEmit"
        />

        <label class="sr-only" :for="`identifier-value-${index}`">identifier value {{ Number(index) + 1 }}</label>
        <input
          :id="`identifier-value-${index}`"
          type="text"
          v-model="id.value"
          :disabled="locked"
          placeholder="value"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
          :pattern="FHIR_RE.uri.source"
          @input="validateAndEmit"
        />

        <button
          type="button"
          @click="removeIdentifier(Number(index))"
          class="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-2 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
          :disabled="locked || form.identifier.length <= 1"
          :aria-label="`Identifier ${Number(index) + 1} entfernen`"
          title="Entfernen"
        >
          ✕
        </button>
      </div>

      <div class="flex items-center justify-end">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          :field-key="'identifier[' + index + ']'"
        />
      </div>
    </div>
  </div>

  <button
    type="button"
    @click="addIdentifier"
    class="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
    :disabled="locked"
  >
    + Add Identifier
  </button>
</div>


    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">version</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.version"
          @input="validateAndEmit"
        />
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="version"
        />
      </div>
    </div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">name</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.name"
          @input="validateAndEmit"
        />
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="name"
        />
      </div>
    </div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">title</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.title"
          @input="validateAndEmit"
        />
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="title"
        />
      </div>
    </div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">date</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.date"
          :pattern="FHIR_RE.date.source"
          @input="validateAndEmit"
        />
        <p v-if="errors.date" class="text-red-600 text-sm mt-1">{{ errors.date }}</p>
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="date"
        />
      </div>
    </div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">last review date</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.lastReviewDate"
          :pattern="FHIR_RE.date.source"
          @input="validateAndEmit"
        />
        <p v-if="errors.lastReviewDate" class="text-red-600 text-sm mt-1">{{ errors.lastReviewDate }}</p>
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line="preview.lineMapFields.lastReviewDate"
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="extension[resource-lastReviewDate]"
        />
      </div>
    </div>

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">publisher</span>
      </div>

      <div>
        <input
          type="text"
          class="w-full h-10 border rounded px-3 focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.publisher"
          @input="validateAndEmit"
        />
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="publisher"
        />
      </div>
    </div>

    <ContactDetailList
      title="Contact"
      :items="form.contact"
      :disabled="locked"
      :file-name="templateName"
      :type="commentType"
      :comments="commentsList"
      :can-write="canWrite"
      :add-comment="addCommentFn"
      :reply-to-thread="props.replyToThread"
      :item-line-map="preview.contactLineMap"
      :telecom-line-map="preview.contactTelecomLineMap"
      @update:items="setContacts"
    />

    <ContactDetailList
      title="Extension: artifact-author"
      :items="form.artifactAuthors"
      :disabled="locked"
      :file-name="templateName"
      :type="commentType"
      :comments="commentsList"
      :can-write="canWrite"
      :add-comment="addCommentFn"
      :reply-to-thread="props.replyToThread"
      :item-line-map="preview.authorLineMap"
      :telecom-line-map="preview.authorTelecomLineMap"
      @update:items="setAuthors"
    />

    <div class="grid grid-cols-[10rem_1fr_auto] gap-4 items-start">
      <div class="h-10 flex items-center">
        <span class="w-full font-semibold text-gray-700 px-2 py-1 rounded">description</span>
      </div>

      <div>
        <textarea
          class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-gray-300 min-h-[120px] disabled:cursor-not-allowed disabled:bg-gray-50"
          :disabled="locked"
          v-model="form.description"
          @input="validateAndEmit"
        ></textarea>
      </div>

      <div class="h-10 flex items-center">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          field-key="description"
        />
      </div>
    </div>

    <div class="space-y-3">
  <span class="block text-sm font-medium text-gray-600">Property</span>

  <div v-for="(p, index) in form.property" :key="index">
    <div class="grid grid-cols-[1fr_auto] gap-3 items-start">
      <div class="space-y-2">
        <div class="flex gap-2 items-start">
          <label class="sr-only" :for="`property-code-${index}`">property code {{ Number(index) + 1 }}</label>
          <input
            :id="`property-code-${index}`"
            type="text"
            v-model="p.code"
            :disabled="locked"
            placeholder="code"
            class="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
            :pattern="FHIR_RE.code.source"
            @input="validateAndEmit"
          />

          <label class="sr-only" :for="`property-uri-${index}`">property uri {{ Number(index) + 1 }}</label>
          <input
            :id="`property-uri-${index}`"
            type="text"
            v-model="p.uri"
            :disabled="locked"
            placeholder="uri (optional)"
            class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
            :pattern="FHIR_RE.uri.source"
            @input="validateAndEmit"
          />

          <label class="sr-only" :for="`property-type-${index}`">property type {{ Number(index) + 1 }}</label>
          <input
            :id="`property-type-${index}`"
            type="text"
            v-model="p.type"
            :disabled="locked"
            placeholder="type"
            class="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
            :pattern="FHIR_RE.code.source"
            @input="validateAndEmit"
          />

          <button
            type="button"
            @click="removeProperty(Number(index))"
            class="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-2 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
            :disabled="locked || form.property.length <= 1"
            :aria-label="`Property ${Number(index) + 1} entfernen`"
            title="Entfernen"
          >
            ✕
          </button>
        </div>

        <div class="flex gap-2 items-start">
          <div class="w-32"></div>
          <label class="sr-only" :for="`property-description-${index}`">property description {{ Number(index) + 1 }}</label>
          <textarea
            :id="`property-description-${index}`"
            v-model="p.description"
            :disabled="locked"
            placeholder="description"
            class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50"
            rows="2"
            @input="validateAndEmit"
          ></textarea>
        </div>
      </div>

      <div class="flex items-start justify-end pt-1">
        <FieldComments
          :file-name="templateName"
          :type="commentType"
          :line=1
          :comments="commentsList"
          :can-write="canWrite"
          :add-comment="addCommentFn"
          :reply-to-thread="props.replyToThread"
          :field-key="'property[' + index + ']'"
        />
      </div>
    </div>
  </div>

  <button
    type="button"
    @click="addProperty"
    class="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
    :disabled="locked"
  >
    + Add Property
  </button>
</div>


    <div class="mt-4">
      <h3 class="text-sm font-medium text-gray-600 mt-2">JSON Vorschau</h3>
      <pre class="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm">{{ jsonPreview }}</pre>
    </div>
  </div>
</template>
