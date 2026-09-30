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

import Navigation from './Navigation.vue';
import { runtimeConfig } from "../../config";

const ztsURL = runtimeConfig.ZTS_URL;

</script>

<template>
  <header>
    <div class="container mx-auto px-4 py-4 flex flex-col items-center">
      <!-- Logos -->
      <div class="flex items-center space-x-4 mb-4">
        <a :href="ztsURL"><img src="@/assets/images/logo_zts.svg" alt="ZTS" class="h-16" /></a>
        <a href="https://www.bfarm.de/DE/Home/_node.html"><img src="@/assets/images/logo_bfarm.svg" alt="BfArM"
            class="h-16" /></a>
        <a href="https://www.gematik.de/"><img src="@/assets/images/logo_gematik.svg" alt="Gematik" class="h-8" /></a>
      </div>
    </div>

    <!-- Titel/Subtitel zentral -->
    <div class="bg-gray-100 w-full py-4">
      <div class="text-center">
        <h1 class="title-text">FHIR Template Editor</h1>
        <p class="subtitle-text">des zentralen Terminologieservers</p>
      </div>
    </div>

    <Navigation />
  </header>
</template>
