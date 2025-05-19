<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

interface FolderEntry {
    name: string;
    link: string;
}

const route = useRoute();
const sections = ref([] as FolderEntry[]);
let path = route.params.path;

if (typeof (path) === "string") {
    path = path.split("/");
}

function generateSegments(pathSegments: string[]) {
    let arr = [
        {
            name: "Home",
            link: "/files/"
        }
    ];

    for (let i = 0; i < pathSegments.length; i++) {
        if (pathSegments[i].length === 0) {
            continue;
        }

        let link = "/files/";

        for (let j = 0; j <= i; j++) {
            link += pathSegments[j];
            link += "/";
        }

        arr.push({
            name: pathSegments[i],
            link,
        });
    }

    sections.value = arr;
}

watch(() => route.params.path, (newPath, oldPath) => {
    if (typeof (newPath) === "string") {
        newPath = newPath.split("/");
    }

    generateSegments(newPath);
});

generateSegments(path);
</script>

<template>
    <nav id="locationBar" aria-label="Location Bar" class="flex p-2 rounded bg-theme-soft flex-1">
        <RouterLink v-for="(section, index) in sections" :to="section.link" class="location-link">
            {{ index + 1 === sections.length ? section.name : `${section.name} &rsaquo;` }}
        </RouterLink>
    </nav>
</template>

<style scoped>
.location-link {
    padding: 4px 8px;
    transition: 250ms;
    border-radius: 4px;
}

.location-link:hover {
    background: var(--color-background-mute);
}
</style>
