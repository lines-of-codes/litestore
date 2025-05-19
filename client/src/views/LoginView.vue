<script setup lang="ts">
import { getToken, login } from "@/lib/auth";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const username = ref("");
const password = ref("");

if (getToken() !== null) {
    router.push("/files/");
}

async function handleSubmit() {
    const resp = await login(username.value, password.value);

    const jsonData = await resp.json();

    if (!resp.ok) {
        alert(`ERR ${resp.status}: ${jsonData.message}`);
        return;
    }

    localStorage.setItem("ls-auth-token", jsonData.token);
    router.push("/files/");
}
</script>

<template>
    <main class="min-h-[100vh] flex flex-col justify-center items-center gap-2">
        <h1 class="text-3xl">Log in</h1>
        <form class="flex flex-col gap-2" @submit.prevent="handleSubmit">
            <input type="text" name="username" id="username" class="text-input" placeholder="Username"
                v-model="username" required>
            <input type="password" name="password" id="password" class="text-input" placeholder="Password"
                v-model="password" required>
            <input type="submit" value="Log in" class="btn">
        </form>
        <p>
            Don't have an account? <RouterLink to="/signup" class="link">Sign up.</RouterLink>
        </p>
    </main>
</template>