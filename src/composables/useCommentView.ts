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

import { computed, type Ref } from "vue";
import type { CommentItem, CommentType } from "../types";

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ThreadView = {
    threadId: string;
    comments: CommentItem[];
    openCount: number;
    lastCreatedAt: string;
    line?: number;
};

export function useCommentView(args: {
    comments: Ref<CommentItem[]>;
    fileName: Ref<string>;
    type: Ref<CommentType>;

    line: Ref<number>;
    fieldKey: Ref<string | null>;
    displayScope: Ref<"line" | "file">;
}) {
    const effectiveScope = computed<"line" | "file">(() => {
        if (args.fieldKey.value) return "file";
        return args.displayScope.value;
    });

    function markerPrefix() {
        if (!args.fieldKey.value) return "";
        return `[[field:${args.fieldKey.value}]] `;
    }

    function hasMarker(body: string) {
        const fk = args.fieldKey.value;
        if (!fk) return false;
        const re = new RegExp(String.raw`^\[\[field:${escapeRegExp(fk)}\]\]`, "i");
        return re.test(body ?? "");
    }

    function stripMarker(body: string) {
        const fk = args.fieldKey.value;
        if (!fk) return body ?? "";
        const re = new RegExp(String.raw`^\[\[field:${escapeRegExp(fk)}\]\]\s*`, "i");
        return (body ?? "").replace(re, "");
    }

    const base = computed(() => {
        const all = Array.isArray(args.comments.value) ? args.comments.value : [];
        return all.filter((c) => c.fileName === args.fileName.value && c.type === args.type.value);
    });

    const relevant = computed(() => {
        if (args.fieldKey.value) return base.value.filter((c) => hasMarker(c.body));
        if (effectiveScope.value === "file") return base.value;
        return base.value.filter((c) => (c.line ?? 1) === args.line.value);
    });

    const threads = computed<ThreadView[]>(() => {
        const map = new Map<string, CommentItem[]>();

        for (const c of relevant.value) {
            const key = c.threadId || c.id;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(c);
        }

        const out: ThreadView[] = [];
        for (const [threadId, comments] of map.entries()) {
            const sorted = comments.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            const openCount = sorted.filter((x) => !x.resolved).length;
            const lastCreatedAt = sorted[sorted.length - 1]?.createdAt ?? "";
            const line = sorted[0]?.line;
            out.push({ threadId, comments: sorted, openCount, lastCreatedAt, line });
        }

        return out.sort((a, b) => b.lastCreatedAt.localeCompare(a.lastCreatedAt));
    });

    const openCount = computed(() => threads.value.reduce((sum, t) => sum + t.openCount, 0));

    function lineItems(lineNo: number) {
        return base.value.filter((c) => (c.line ?? 1) === lineNo);
    }

    function totalCount(lineNo: number) {
        return lineItems(lineNo).length;
    }

    function openCountForLine(lineNo: number) {
        return lineItems(lineNo).filter((c) => !c.resolved).length;
    }

    return {
        effectiveScope,
        markerPrefix,
        stripMarker,
        threads,
        openCount,
        totalCount,
        openCountForLine,
    };
}
