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
  <div class="file-uploader">
    <div v-if="localInputFiles.length > 0" class="existing-files mb-4">
      <n-card title="Bereits hochgeladene Input-Dateien" size="small">
        <n-list>
          <n-list-item v-for="(file, index) in localInputFiles" :key="file.name + index">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <n-icon size="20">
                  <DocumentIcon v-if="!file.name?.toLowerCase().endsWith('.zip')" />
                  <ArchiveIcon v-else />
                </n-icon>
                <span>{{ file.name }}</span>
                <n-tag round type="success">
                  {{ fmtDate(file.lastModified) }}
                </n-tag>
              </div>
              <n-button v-if="!disabled" color="red" circle quaternary @click="confirmDeleteFile(index, file)"
                :loading="deletingIndex === index">
                <n-icon size="20">
                  <Delete24Regular />
                </n-icon>
              </n-button>
            </div>
          </n-list-item>
        </n-list>
      </n-card>
    </div>
    <!-- Datei-Upload Bereich -->
    <n-upload multiple directory-dnd :action="null" :max="5" :default-upload="false" @change="handleFileChange"
      @before-upload="beforeUpload" :file-list="fileList" @remove="handleFileRemove" :disabled="disabled || uploading">
      <n-upload-dragger>
        <div style="margin-bottom: 12px">
          <n-icon size="48" :depth="3">
            <ArchiveIcon />
          </n-icon>
        </div>
        <n-text style="font-size: 16px">
          Klicken Sie hier oder ziehen Sie eine Datei in diesen Bereich, um sie hochzuladen
        </n-text>
        <n-p depth="3" style="margin: 8px 0 0 0">
          Bitte laden Sie nur Dateien im Format FHIR-XML oder FHIR-JSON oder ZIP hoch. Maximale Dateigröße: 100 MB.
        </n-p>
      </n-upload-dragger>
    </n-upload>

    <!-- Upload-Button -->
    <div v-if="fileList.length > 0 && !disabled" class="upload-button mt-4">
      <n-button type="primary" @click="uploadFiles" :loading="uploading" :disabled="uploading">
        {{ uploading ? 'Upload läuft...' : 'Dateien hochladen' }}
      </n-button>
    </div>

    <!-- Liste der hochgeladenen Dateien -->
    <div v-if="uploadedFiles.length > 0" class="file-list mt-4">
      <n-card title="Hochgeladene Dateien" size="small">
        <n-list>
          <n-list-item v-for="(file, index) in uploadedFiles" :key="(file.fileName ?? `file-${index}`) + index">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <n-icon size="20">
                  <DocumentIcon v-if="!file.fileName?.toLowerCase().endsWith('.zip')" />
                  <ArchiveIcon v-else />
                </n-icon>
                <span>{{ file.fileName }}</span>
                <n-tag type="success" round v-if="file.success">
                  Erfolgreich
                </n-tag>
                <n-tag type="error" round v-if="!file.success">
                  Fehler
                </n-tag>
              </div>
            </div>
            <div v-if="!file.success && 'error' in file && file.error" class="text-xs text-red-500 mt-1">
              {{ file.error }}
            </div>
          </n-list-item>
        </n-list>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { Archive48Regular as ArchiveIcon, Document48Regular as DocumentIcon, Delete24Regular } from '@vicons/fluent';
import type { UploadFileInfo } from 'naive-ui';
import { commitFile, commitWorkspace } from '../api/workspaces';
import type { InputFiles, CommitChange, StatusMessageState } from '../types';
import { useDialog, useMessage } from 'naive-ui';
import { fmtDate } from '../utils/utils';
import { formatApiError, toErrorStatusMessage, toInfoStatusMessage, toSuccessStatusMessage, toWarningStatusMessage } from '../utils/apiErrorPresentation';

const props = defineProps<{
  disabled?: boolean;
  repositoryId: string;
  branch: string;
  packageName: string;
  version: string;
  createMergeRequest?: boolean;
  inputFiles?: InputFiles[];
  statusMessage?: StatusMessageState;
}>();


const emit = defineEmits<{
  (e: 'update:input-files', files: InputFiles[]): void;
  (e: 'upload-success', files: any[]): void;
  (e: 'upload-error', error: any): void;
  (e: 'update:status-message', status: StatusMessageState): void;
}>();

const dialog = useDialog();
const naiveMessage = useMessage();


// Maximale Dateigröße: 100 MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const localInputFiles = ref<InputFiles[]>(props.inputFiles || []);
const fileList = ref<UploadFileInfo[]>([]);
type UploadResult = 
  | { success: true; fileName: string; commitId?: string; head?: string}
  | { success: false; fileName: string; error: string };
const uploadedFiles = ref<UploadResult[]>([]);

const uploading = ref(false);
const deletingIndex = ref<number | null>(null);
const isUploading = ref(false); 
const hasZipFiles = computed(() => {
  return fileList.value.some(f => f.file?.name.toLowerCase().endsWith('.zip'));
});

// Watcher für Props-Änderungen
watch(() => props.inputFiles, (newFiles) => {
   if (!isUploading.value) {
    localInputFiles.value = newFiles || [];
   }
}, { immediate: true });

// Validierung Dateiendung
function isValidFileExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.zip') || lowerName.endsWith('.xml') || lowerName.endsWith('.json');
}

// Validierung der gesamten Dateiauswahl
function validateFileSelection(files: UploadFileInfo[]): { valid: boolean; message: string | null } {
  if (files.length === 0) {
    return { valid: true, message: null };
  }

  // Prüfe ob alle Dateien gültige Endungen haben
  for (const fileInfo of files) {
    if (!fileInfo.file) continue;
    if (!isValidFileExtension(fileInfo.file.name)) {
      return {
        valid: false,
        message: `${fileInfo.file.name} hat kein gültiges Format. Erlaubt: .zip, .xml, .json`
      };
    }
  }

  // Prüfe Dateigrößen
  for (const fileInfo of files) {
    if (fileInfo.file && fileInfo.file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `${fileInfo.file.name} ist zu groß (max. 100 MB)`
      };
    }
  }

  // Prüfe auf gemischte Uploads (ZIP zusammen mit XML/JSON)
  const hasZip = files.some(f => f.file?.name.toLowerCase().endsWith('.zip'));
  const hasXmlJson = files.some(f => {
    const name = f.file?.name.toLowerCase();
    return name?.endsWith('.xml') || name?.endsWith('.json');
  });

  if (hasZip && hasXmlJson) {
    return {
      valid: false,
      message: 'Sie können nicht gleichzeitig ZIP und FHIR-XML/JSON Dateien hochladen. Bitte entscheiden Sie sich für eine Option.'
    };
  }

  return { valid: true, message: null };
}

function setStatus(status: StatusMessageState) {
  emit('update:status-message', status);
}

function confirmDeleteFile(index: number, file: InputFiles) {
  dialog.warning({
    title: 'Datei löschen',
    content: `Soll die Datei "${file.name}" wirklich gelöscht werden?`,
    positiveText: 'Ja, löschen',
    negativeText: 'Abbrechen',
    onPositiveClick: async () => {
      await deleteFile(index, file);
    },
  });
}

async function deleteFile(index: number, file: InputFiles) {
  deletingIndex.value = index;
  setStatus(toInfoStatusMessage(`Die Datei ${file.name} wird gelöscht...`));

  try {
    const changes: CommitChange[] = [{
      action: 'delete',
      type: 'input_file',
      fileName: file.name,
      content: '',
      encoding: 'text'
    }];

    let branch = props.branch;
    if (!branch || branch === 'dev') {
      branch = `feature/${props.version}`;
    }

    await commitWorkspace({
      repositoryId: props.repositoryId,
      branch: branch,
      packageName: props.packageName,
      version: props.version,
      message: `Delete file: ${file.name}`,
      changes: changes,
    });

    localInputFiles.value.splice(index, 1);
    emit('update:input-files', localInputFiles.value);

    setStatus(toSuccessStatusMessage(`Die Datei ${file.name} wurde erfolgreich gelöscht.`));

  } catch (error: any) {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
    setStatus(toErrorStatusMessage({ message: `Fehler beim Löschen der Datei ${file.name}${detail}` }, `Fehler beim Löschen der Datei ${file.name}`));
  } finally {
    deletingIndex.value = null;
  }
}

// Validierung vor dem Upload (einzelne Datei)
function beforeUpload(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  const file = data.file.file;

  if (!file) {
    setStatus(toErrorStatusMessage({ message: 'Die Datei konnte nicht gelesen werden.' }, 'Die Datei konnte nicht gelesen werden.'));
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    setStatus(toErrorStatusMessage({ message: `Die Datei ${file.name} ist zu groß. Erlaubt sind maximal 100 MB.` }, `Die Datei ${file.name} ist zu groß. Erlaubt sind maximal 100 MB.`));
    return false;
  }

  if (!isValidFileExtension(file.name)) {
    setStatus(toErrorStatusMessage({ message: `Die Datei ${file.name} hat kein gültiges Format. Erlaubt sind .zip, .xml oder .json.` }, `Die Datei ${file.name} hat kein gültiges Format. Erlaubt sind .zip, .xml oder .json.`));
    return false;
  }

  return true;
}

function handleFileChange(options: { fileList: UploadFileInfo[] }) {
  const validation = validateFileSelection(options.fileList);

  if (!validation.valid) {
    setStatus(toErrorStatusMessage({ message: validation.message || 'Ungültige Dateiauswahl.' }, validation.message || 'Ungültige Dateiauswahl.'));
    fileList.value = [];
    return;
  }

  fileList.value = options.fileList;

  if (fileList.value.length > 0) {
    const fileTypes = hasZipFiles.value ? 'ZIP' : 'XML/JSON';
    setStatus(toInfoStatusMessage(`${fileList.value.length} ${fileTypes} Datei(en) ausgewählt. Klicken Sie auf "Dateien hochladen", um fortzufahren.`));
  }
}

function handleFileRemove(options: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  fileList.value = options.fileList;

  if (fileList.value.length > 0) {
    const validation = validateFileSelection(fileList.value);
    if (!validation.valid) {
      setStatus(toErrorStatusMessage({ message: validation.message || 'Ungültige Dateiauswahl.' }, validation.message || 'Ungültige Dateiauswahl.'));
      fileList.value = [];
    }
  } else {
    setStatus({ type: 'info', title: 'Hinweis', message: null, debug: null });
  }
}

async function uploadSingleFile(inputfile: File): Promise<UploadResult>  {
  let branch = props.branch;
  if (!branch || branch === 'dev') {
    branch = `feature/${props.version}`;
  }
  const fileName = inputfile.name;
  isUploading.value = true; 
  try {
    const response = await commitFile({
      action: 'create',
      repositoryId: props.repositoryId,
      branch: branch,
      packageName: props.packageName,
      version: props.version,
      file: inputfile,
      fileName: fileName,
      message: `Upload Datei: ${fileName}`
    });

    const newFile: InputFiles = {
      name: fileName,
      lastModified: new Date().toISOString(),
      size: inputfile.size,
      type: inputfile.type,
      success: true
    };

    localInputFiles.value = [...localInputFiles.value, newFile];
    emit('update:input-files', localInputFiles.value);
    await nextTick();

    const result: UploadResult = { 
      success: true, 
      fileName: fileName,
      commitId: response.commitId,
      head: response.head
    };
    return result;

  } catch (error: any) {
    const formattedError = formatApiError(error, `Die Datei ${fileName} konnte nicht hochgeladen werden.`);
    setStatus({ type: 'error', title: formattedError.title, message: formattedError.message, debug: formattedError.debug });
    return {
      success: false,
      error: formatApiError(error, `Die Datei ${inputfile.name} konnte nicht hochgeladen werden.`).message,
      fileName: inputfile.name
    };
    } finally {
    isUploading.value = false;
  }
}

async function uploadFiles() {
  if (fileList.value.length === 0) {
    setStatus(toWarningStatusMessage('Bitte wählen Sie Dateien aus.'));
    return;
  }
  const validation = validateFileSelection(fileList.value);
  if (!validation.valid) {
    setStatus(toErrorStatusMessage({ message: validation.message || 'Ungültige Dateiauswahl.' }, validation.message || 'Ungültige Dateiauswahl.'));
    return;
  }

  const confirm = await new Promise((resolve) => {
    const fileTypes = hasZipFiles.value ? 'ZIP' : 'XML/JSON';
    dialog.warning({
      title: 'Dateien hochladen',
      content: `${fileList.value.length} ${fileTypes} Datei(en) werden hochgeladen. Fortfahren?`,
      positiveText: 'Ja, hochladen',
      negativeText: 'Abbrechen',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false)
    });
  });

  if (!confirm) return;

  uploading.value = true;
  setStatus(toInfoStatusMessage('Der Upload wurde gestartet.'));
  uploadedFiles.value = [];
  const successfulUploads: any[] = [];
  let hasErrors = false;
  const errors: string[] = [];

  try {
    for (const fileInfo of fileList.value) {
      if (fileInfo.file) {
        const result = await uploadSingleFile(fileInfo.file);
        uploadedFiles.value.push(result);

        if (result.success) {
          naiveMessage.success(`${fileInfo.file.name} erfolgreich hochgeladen`);
          successfulUploads.push(result.fileName);
        } else {

          hasErrors = true;
          errors.push(`${result.fileName}: ${result.error}`);
        }
      }
    }

    const successful = uploadedFiles.value.filter(f => f.success).length;


    if (successful === fileList.value.length && !hasErrors ) {
      setStatus(toSuccessStatusMessage(`${successful} von ${fileList.value.length} Dateien erfolgreich hochgeladen.`));
    } else if (successful === 0) {
      setStatus(toErrorStatusMessage({ message: `Alle Uploads sind fehlgeschlagen: ${errors.join('; ')}` }, `Alle Uploads sind fehlgeschlagen: ${errors.join('; ')}`));
    } else {
      setStatus(toWarningStatusMessage(`${successful} von ${fileList.value.length} Dateien erfolgreich hochgeladen. Fehler: ${errors.join('; ')}`));
    }
    if (successfulUploads.length > 0) {
      emit('upload-success', successfulUploads);
    }
    fileList.value = [];

    setTimeout(() => {
      uploadedFiles.value = [];
    }, 600);

  } catch (error: any) {
    setStatus(toErrorStatusMessage(error, 'Beim Upload ist ein Fehler aufgetreten.'));
    emit('upload-error', error);
  } finally {
    uploading.value = false;
  }
}

defineExpose({
  uploadFiles,
  uploadedFiles,
  inputFiles: localInputFiles
});
</script>