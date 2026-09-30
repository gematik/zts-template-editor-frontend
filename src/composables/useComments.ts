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

import { computed, ref, watch, unref, type Ref } from "vue";
import type { CommentItem, CommentType } from "../types";
import { getComments, createComment, replyToThread } from "../api/comments";

type MaybeRef<T> = T | Ref<T>;

export function useComments(ctx: {
    repositoryId: MaybeRef<string>;
    branch: MaybeRef<string>;
    version: MaybeRef<string>;
    mrId: MaybeRef<number | null>;
    canWrite: MaybeRef<boolean>;
}) {
    const loading = ref(false);
    const error = ref<string | null>(null);
    const items = ref<CommentItem[]>([]);

    const mrIdString = computed(() => {
        const v = unref(ctx.mrId);
        return v == null ? null : String(v);
    });

    const threads = computed(() => {
        const map = new Map<string, CommentItem[]>();
        for (const c of items.value) {
            const key = c.threadId || c.id;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(c);
        }

        return Array.from(map.entries())
            .map(([threadId, comments]) => ({
                threadId,
                comments: comments
                    .slice()
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
            }))
            .sort((a, b) => {
                const al = a.comments[a.comments.length - 1]?.createdAt ?? "";
                const bl = b.comments[b.comments.length - 1]?.createdAt ?? "";
                return bl.localeCompare(al);
            });
    });

    async function refresh() {
        loading.value = true;
        error.value = null;

        try {
            const repo = unref(ctx.repositoryId);
            const branch = unref(ctx.branch);
            const version = unref(ctx.version);

            if (!mrIdString.value) {
                items.value = [];
                return;
            }

            const payload = await getComments({
                repositoryId: repo,
                mrId: mrIdString.value,
                branch,
                version,
            });

            items.value = payload.comments ?? [];
        } catch (e: any) {
            error.value = e?.message ?? String(e);
            items.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function addComment(input: {
        type: CommentType;
        fileName: string;
        line: number;
        body: string;
    }) {
        if (!unref(ctx.canWrite))
            throw new Error("Kommentieren ist nur im Review erlaubt.");
        if (!mrIdString.value) throw new Error("Kein MR vorhanden.");

        loading.value = true;
        error.value = null;

        try {
            await createComment({
                repositoryId: unref(ctx.repositoryId),
                branch: unref(ctx.branch),
                mrId: mrIdString.value,
                version: unref(ctx.version),
                type: input.type,
                fileName: input.fileName,
                line: input.line,
                body: input.body,
            });

            await refresh();
        } catch (e: any) {
            error.value = e?.message ?? String(e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function reply(input: { threadId: string; body: string; resolved: boolean }) {
        if (!unref(ctx.canWrite))
            throw new Error("Kommentieren ist nur im Review erlaubt.");

        const mrId = unref(ctx.mrId);
        if (mrId == null) throw new Error("Kein MR vorhanden.");

        loading.value = true;
        error.value = null;

        try {
            await replyToThread({
                repositoryId: unref(ctx.repositoryId),
                mrId,
                threadId: input.threadId,
                body: input.body,
                resolved: input.resolved,
            });

            await refresh();
        } catch (e: any) {
            error.value = e?.message ?? String(e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    watch(
        () => [unref(ctx.repositoryId), unref(ctx.branch), unref(ctx.version), unref(ctx.mrId)],
        () => refresh(),
        { immediate: true }
    );

    return { loading, error, items, threads, refresh, addComment, reply };
}
