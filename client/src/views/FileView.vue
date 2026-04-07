<script setup lang="ts">
import LocationBar from '@/components/LocationBar.vue';
import { getDownloadUrl } from '@/lib/files';
import { basicSetup, EditorView } from 'codemirror';
import { useTemplateRef } from 'vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { LanguageSupport } from "@codemirror/language";

const editorParentRef = useTemplateRef("editor-parent");
const contentType = ref("");
const objectText = ref("");
const objectUrl = ref("");
const fileName = ref("");
const errMsg = ref("");
const route = useRoute();
const darkThemeQuery = matchMedia("(prefers-color-scheme: dark)");
const langMap: Record<string, () => Promise<LanguageSupport>> = {
    md: async () => ((await import("@codemirror/lang-markdown")).markdown()),
    js: async () => ((await import("@codemirror/lang-javascript")).javascript()),
    jsx: async () => ((await import("@codemirror/lang-javascript")).javascript({ jsx: true })),
    ts: async () => ((await import("@codemirror/lang-javascript")).javascript({ typescript: true })),
    tsx: async () => ((await import("@codemirror/lang-javascript")).javascript({ jsx: true, typescript: true })),
    vue: async () => ((await import("@codemirror/lang-vue")).vue()),
    py: async () => ((await import("@codemirror/lang-python")).python())
};

let view: EditorView;
let path = route.params.path;

async function fetchFile(filePath: string) {
    const file = await getDownloadUrl(filePath);
    fileName.value = file.filename;
    const resp = await fetch(file.url);
    const type = resp.headers.get("content-type");

    if (type !== null) {
        console.log(type);
        contentType.value = type;
    }

    if (type === null || type.startsWith("text/")) {
        objectText.value = await resp.text();
        let extensions = [basicSetup];
        if (darkThemeQuery.matches) {
            extensions.push((await import("@/lib/cmSlateTheme")).slateTheme);
        }
        let lang = langMap[file.filename.split(".").at(-1) ?? 0];
        if (lang !== undefined) {
            extensions.push(await lang());
        }
        view = new EditorView({
            extensions,
            parent: editorParentRef.value!,
            doc: objectText.value,
        });
    } else {
        objectUrl.value = URL.createObjectURL(await resp.blob());
    }
}

watch(
    () => route.params.path,
    async (newPath, oldPath) => {
        errMsg.value = "";

        if (newPath instanceof Array) {
            newPath = newPath.join("/");
        }

        path = newPath;
        URL.revokeObjectURL(objectUrl.value);
        await fetchFile(path);
    }
);

onMounted(async () => {
    if (path instanceof Array) {
        path = path.join("/");
    }

    await fetchFile(path);
});

onUnmounted(() => {
    URL.revokeObjectURL(objectUrl.value);
})
</script>

<template>
    <div class="flex items-center m-4 gap-2">
        <LocationBar :filename="fileName" />
    </div>
    <main class="m-4 full-cm" ref="editor-parent">
        <div v-if="objectText === '' && objectUrl === ''">Loading...</div>
        <div v-if="contentType.startsWith('image/')" class="p-2 bg-theme-soft">
            <img :alt="`${fileName}`" :src="objectUrl" class="max-h-[84vh]" />
        </div>
    </main>
</template>