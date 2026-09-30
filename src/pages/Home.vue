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
import { computed } from "vue";
import { isUnauthorized } from "../auth/oauth2Proxy";
import { useAuth } from "../composables/useAuth";

const { login, isLoggedIn } = useAuth();

function handleLogin() {
  login();
}

const hasToken = computed(() => isLoggedIn.value);
const hasUnauthorizedToken = computed(() => isUnauthorized.value);
</script>

<template>
    <main>
        <div class="segment" id="segment-content">
            <div class="container">
                <div class="row">
                    <div class="inner-wrapper">
                        <div class="col-12">
                            <div v-if="hasToken">
                                <h2>Willkommen zurück!</h2>
                            </div>
                            <div v-else-if="hasUnauthorizedToken">
                                <h2>Unauthorisiert</h2>
                                <p>Dieser Account ist entweder nicht berechtigt auf diese Seite zuzugreifen oder die Sitzung ist abgelaufen.</p>
                                <p>Melden Sie sich bitte erneut an. Sollte es zum selben Fehler kommen, wenden Sie sich bitte an den Support des Zentralen Terminologieservers.</p>
                                <button class="confirm-button" @click="handleLogin">Anmelden</button>
                            </div>
                            <div v-else>
                                <h2>Login</h2>
                                <div class="container">
                                    <button class="confirm-button" @click="handleLogin">Anmelden</button>
                                </div>
                                <div class="mt-3">
                                    <p>Bitte melde dich an, um auf den FHIR Template Editor zuzugreifen.</p>
                                    <p>Nach dem Klick auf "Anmelden" wirst du zum Authentifizierungsdienst
                                        weitergeleitet.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
