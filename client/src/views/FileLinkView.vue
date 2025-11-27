<script setup lang="ts">
import { downloadPublicFile, getFileLinkInfo, type PublicLinkInfo } from '@/lib/publicLink';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const fileInfo = ref({} as PublicLinkInfo);
const uuid = ref("");

async function getFileInfo() {
    try {
        fileInfo.value = await getFileLinkInfo(uuid.value);
    } catch (err) {
        console.error(err);

        if (err instanceof Error) {
            alert(err.message);
        }
    }
}

watch(() => route.params.uuid, async (newId, oldId) => {
    if (typeof (newId) === "string") {
        uuid.value = newId;
    }

    await getFileInfo();
})

onMounted(async () => {
    if (typeof (route.params.uuid) === "string") {
        uuid.value = route.params.uuid;
    }

    await getFileInfo();
});

async function handleDownloadBtn() {
    await downloadPublicFile(uuid.value);
}
</script>

<template>
    <div class="p-8 min-h-[100vh] flex flex-col">
        <header>
            <RouterLink to="/">
                <h1 class="text-2xl link">litestore</h1>
            </RouterLink>
        </header>
        <div class="flex items-center justify-center flex-1">
            <main
                class="bg-theme-soft p-6 my-4 rounded flex flex-col lg:flex-row lg:justify-between lg:items-center lg:max-w-[75vw] flex-1">
                <div>
                    <h1 class="text-xl lg:text-2xl">{{ fileInfo.filename ?? "" }}</h1>
                    <p v-if="fileInfo.downloadCount === 0">
                        This file hasn't been downloaded before.
                    </p>
                    <p v-else>
                        This file has been downloaded {{ fileInfo.downloadCount }} times.
                    </p>
                </div>
                <div>
                    <button @click="handleDownloadBtn" class="btn">Download</button>
                </div>
            </main>
        </div>
    </div>
</template>
