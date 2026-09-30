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

<template>
  <footer id="segment-footer" igtool="footer" class="segment">
    <div class="container">
      <div class="inner-wrapper">
        <!-- Kontakt- und Rechtliches -->
        <p class="footer-links">
          <a :href="ztsURL + '/impressum.html'" 
             title="Impressum der Seite des Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM)">
            Impressum
          </a>
          |
          <a :href="ztsURL + '/dataprotectionhint.html'" 
             title="Datenschutzerklärung der Seite des Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM)">
            Datenschutzerklärung
          </a>
          |
          <a :href="ztsURL + '/kontakt.html'" 
             title="Kontakt des Zentraler Terminologieservers für das deutsche Gesundheitswesen">
            Kontakt
          </a>
          |
          <a :href="ztsURL + '/accessibility.html'" title="Barrierefreiheitserklärung des ZTS">
            Erklärung zur Barrierefreiheit
          </a>
        </p>

        <!-- Copyright -->
        <p class="footer-copy">&copy; BfArM &amp; gematik GmbH</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { runtimeConfig } from "../../config";

const ztsURL = runtimeConfig.ZTS_URL;
</script>
