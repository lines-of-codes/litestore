<script setup lang="ts">
import CreateFolderDialog from '@/components/CreateFolderDialog.vue';
import LocationBar from '@/components/LocationBar.vue';
import { deleteFile, listFile, uploadFile, type FileInfo } from '@/lib/files';
import { getFileIcon } from '@/util/fileIcon';
import { Dropdown } from 'flowbite';
import { onMounted, ref, useTemplateRef, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

interface OngoingAction {
    name: string;
    indeterminate: boolean;
    progress?: number;
}

const route = useRoute();
const errMsg = ref("");

let path = route.params.path;

if (path instanceof Array) {
    path = path.join("/");
}

const createMenuBtn = useTemplateRef("create-menu-btn");
const createMenuElement = useTemplateRef("create-menu");
const newFolderDialog = useTemplateRef("new-folder-dialog");
const files: Ref<FileInfo[], FileInfo[]> = ref([]);
const ongoingActions = ref([] as OngoingAction[]);
let createMenuDropdown: Dropdown | null;

async function fetchFileList(targetPath: string) {
    try {
        files.value = await listFile(targetPath);
    } catch (err) {
        console.error(err);
        if (err instanceof Error) {
            errMsg.value = err.message;
        }
    }
}

function fetchFileListCurrent() {
    if (path instanceof Array) {
        path = path.join("/");
    }

    return fetchFileList(path);
}

watch(
    () => route.params.path,
    async (newPath, oldPath) => {
        errMsg.value = "";

        if (newPath instanceof Array) {
            newPath = newPath.join("/");
        }

        path = newPath;

        await fetchFileList(newPath);
    }
);

onMounted(async () => {
    createMenuDropdown = new Dropdown(createMenuElement.value, createMenuBtn.value);

    await fetchFileListCurrent();
});

function handleNewFolderButton() {
    if (createMenuDropdown === null || newFolderDialog.value === null) {
        return;
    }

    createMenuDropdown.hide();
    newFolderDialog.value.showModal();
}

function handleDeleteButton(filePath: string) {
    if (confirm(`Are you sure you want to delete the file/folder? (${filePath})`)) {
        const newLength = ongoingActions.value.push({
            name: `Deleting ${filePath}`,
            indeterminate: true
        });
        deleteFile(filePath).then(async (resp) => {
            ongoingActions.value.splice(newLength - 1, 1);

            const jsonData = await resp.json();

            if (!resp.ok) {
                alert(`ERR ${resp.status}: ${jsonData.message}`);
                return;
            }

            await fetchFileListCurrent();
        });
    }
}

function handleUploadButton() {
    createMenuDropdown?.hide();
    var fileInput = document.createElement("input");
    fileInput.type = "file";

    fileInput.onchange = async e => {
        if (fileInput.files === null) return;

        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];

            const newIndex = ongoingActions.value.push({
                name: `Uploading ${file.name}`,
                indeterminate: true
            }) - 1;
            uploadFile(`${path as string}${file.name}`, file).then(async () => {
                ongoingActions.value.splice(newIndex, 1);
                await fetchFileListCurrent();
            }, (err) => {
                console.error(err);

                if (err instanceof Error) {
                    alert(err.message);
                }
            });
        }
    }

    fileInput.click();
}
</script>

<template>
    <div class="flex items-center m-4 gap-2">
        <LocationBar />
        <button class="btn-lg" id="createMenuBtn" data-dropdown-toggle="createMenuDropdown" ref="create-menu-btn">
            <i class="bi bi-plus-lg text-lg"></i>
        </button>
    </div>
    <div id="createMenuDropdown" class="z-10 hidden w-24 rounded dark:bg-slate-700 border border-theme -translate-x-4"
        ref="create-menu">
        <div class="flex flex-col">
            <button class="dropdown-menu-btn" @click="handleNewFolderButton">
                <i class="bi bi-folder"></i>
                Folder
            </button>
            <button class="dropdown-menu-btn" @click="handleUploadButton">
                <i class="bi bi-upload"></i>
                Upload
            </button>
        </div>
    </div>
    <CreateFolderDialog ref="new-folder-dialog" :refresh-file-list="fetchFileListCurrent" />
    <main class="m-4 p-2 bg-theme-soft">
        <div v-show="errMsg" class="px-2">
            <h1 class="text-2xl">Error!</h1>
            <p>{{ errMsg }}</p>
        </div>
        <div v-show="errMsg === '' && files.length === 0">No files in directory.</div>
        <ul>
            <li v-for="file in files" class="flex justify-between items-center file-entry">
                <RouterLink :to="`/files${file.virtual_path}`" class="px-2">
                    <i :class="getFileIcon(file)"></i>
                    {{ file.filename }}
                </RouterLink>
                <div class="actions px-2">
                    <button class="icon-btn" v-show="!file.is_folder" aria-label="Download"><i
                            class="bi bi-download"></i></button>
                    <button class="icon-btn" aria-label="Trash" @click="() => handleDeleteButton(file.virtual_path)"><i
                            class="bi bi-trash"></i></button>
                </div>
            </li>
        </ul>
    </main>
    <div id="ongoingActions"
        class="fixed bottom-6 bg-theme-soft left-[50%] translate-x-[-50%] py-2 px-4 rounded border-theme border"
        ref="ongoing-actions" v-show="ongoingActions.length > 0">
        <div class="action-entry" v-for="action in ongoingActions">
            <div>{{ action.name }}</div>
            <progress class="rounded w-full"></progress>
        </div>
    </div>
</template>

<style scoped>
.file-entry>.actions {
    opacity: 0;
    transition: 150ms;
}

.file-entry:hover>.actions {
    opacity: 255;
}
</style>