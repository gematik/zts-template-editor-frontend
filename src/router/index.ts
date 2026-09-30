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

import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("../pages/Home.vue") },
    { path: "/projects", name: "projects", component: () => import("../pages/ProjectOverview.vue") },
    { path: "/projects/:projectId/:packageName/versions/new", name: "newVersion", component: () => import("../pages/TemplateForm.vue"), props: { mode: "create" } },
    { path: "/projects/:projectId/:packageName/versions/:version/:workspace", name: "versionDetails", component: () => import("../pages/TemplateForm.vue"), props: { mode: "edit" } },
    { path: "/projects/:projectId/:packageName/versions/:version/:workspace/new", name: "newVersionFrom", component: () => import("../pages/TemplateForm.vue"), props: { mode: "createFrom" } },
  ],
});
