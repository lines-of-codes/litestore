<script setup lang="ts">
import { createFolder } from '@/lib/files';
import { ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps<{
    refreshFileList: () => Promise<void>
}>();
const route = useRoute();
const newFolderDialog = useTemplateRef("new-folder-dialog");
const newFolderName = ref("");

let path = route.params.path;

if (path instanceof Array) {
    path = path.join("/");
}

watch(() => route.params.path, (newPath, oldPath) => {
    if (newPath instanceof Array) {
        newPath = newPath.join("/");
    }

    path = newPath;
})

function showModal() {
    if (newFolderDialog.value === null) return;

    newFolderDialog.value.showModal();
}

async function handleCreateFolder() {
    const resp = await createFolder(`${path}${newFolderName.value}/`);

    const jsonData = await resp.json();

    if (!resp.ok) {
        alert(`ERR ${resp.status}: ${jsonData.message}`);
        return;
    }

    newFolderName.value = "";
    newFolderDialog.value?.close();
    await props.refreshFileList();
}

defineExpose({
    showModal
});
</script>

<template>
    <dialog ref="new-folder-dialog" class="bg-theme-soft m-auto p-4 rounded backdrop:bg-black/30">
        <h1 class="text-2xl">New Folder</h1>
        <input type="text" name="newFolderName" id="newFolderName" class="text-input mt-2 mb-4"
            placeholder="New folder name" v-model="newFolderName">
        <div class="flex justify-end gap-2">
            <button class="btn" @click="() => newFolderDialog?.close()">Cancel</button>
            <button class="btn" @click="handleCreateFolder">Create</button>
        </div>
    </dialog>
</template>