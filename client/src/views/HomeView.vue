<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
    <main class="min-h-screen flex flex-col justify-center items-center gap-4">
        <h1 class="text-6xl tracking-tight">litestore</h1>
        <p class="text-lg">
            A fast and lightweight storage platform.
        </p>
        <div class="flex gap-4">
            <RouterLink to="/login" class="btn">Log in</RouterLink>
            <RouterLink to="/signup" class="btn">Sign up</RouterLink>
        </div>
    </main>
</template>
