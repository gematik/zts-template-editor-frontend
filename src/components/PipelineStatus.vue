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
  <component
    :is="pipeline?.webUrl ? 'a' : 'span'"
    :href="pipeline?.webUrl || undefined"
    :target="pipeline?.webUrl ? '_blank' : undefined"
    :rel="pipeline?.webUrl ? 'noopener noreferrer' : undefined"
    :role="pipeline?.webUrl ? undefined : 'img'"
    class="inline-flex items-center"
    :aria-label=hoverLabel
    :title=hoverLabel
  >
    <NIcon :size="20" :color="status.color" aria-hidden="true">
      <component :is="status.icon" />
    </NIcon>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckmarkCircle24Filled, DismissCircle24Filled, Clock24Regular, ErrorCircle24Filled, PauseCircle24Regular } from '@vicons/fluent';
import type { PipelineRef } from '../types';
import { fmtDate } from '../utils/utils';

const props = defineProps<{
  pipeline?: PipelineRef | null;
}>();

const hoverLabel = computed(() => {
  const pipeline = props.pipeline;
  const pipelineStatus = pipeline?.status ?? 'pending';
  const displayStatus = pipelineStatus.charAt(0).toUpperCase() + pipelineStatus.slice(1);
  const lines = [`Pipeline: ${displayStatus}`];

  if (pipeline) {
    lines.push(
      pipeline.finishedAt
        ? `Beendet: ${fmtDate(pipeline.finishedAt)}`
        : `Letzte Änderung: ${fmtDate(pipeline.updatedAt)}`
    );
  }

  return lines.join('\n');
});

const status = computed(() => {
  switch (props.pipeline?.status ?? 'pending') {
    case 'success':
      return { icon: CheckmarkCircle24Filled, color: '#108548' };
    case 'running':
      return { icon: Clock24Regular, color: '#1F75CB' };
    case 'failed':
      return { icon: DismissCircle24Filled, color: '#dd2b0e' };
    case 'pending':
      return { icon: PauseCircle24Regular, color: '#4a4d4d' };
    default:
      return { icon: ErrorCircle24Filled, color: '#D99530' };
  }
});

</script>