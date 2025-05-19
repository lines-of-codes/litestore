<script setup lang="ts">
import { login, signUp } from "@/lib/auth";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const username = ref("");
const password = ref("");
const passwordConfirm = ref("");

async function handleSubmit() {
    if (password.value !== passwordConfirm.value) {
        alert("The password and the password confirmation don't match.");
        return;
    }

    const resp = await signUp(email.value, username.value, password.value);


    if (!resp.ok) {
        const jsonData = await resp.json();
        alert(`Account Creation Error ${resp.status}: ${jsonData.message}`);
        return;
    }

    const loginResp = await login(username.value, password.value);
    const jsonData = await loginResp.json();

    localStorage.setItem("ls-auth-token", jsonData.token);
    router.push("/files/");
}
</script>

<template>
    <main class="min-h-[100vh] flex flex-col justify-center items-center gap-2">
        <h1 class="text-3xl">Sign up</h1>
        <form class="flex flex-col gap-2" @submit.prevent="handleSubmit">
            <input type="email" name="email" id="email" class="text-input" placeholder="Email" v-model="email" required>
            <input type="text" name="username" id="username" class="text-input" placeholder="Username"
                v-model="username" required>
            <input type="password" name="password" id="password" class="text-input" placeholder="Password"
                v-model="password" required>
            <input type="password" name="password" id="passwordConfirm" class="text-input"
                placeholder="Password Confirmation" v-model="passwordConfirm" required>
            <input type="submit" value="Sign up" class="btn">
        </form>
        <p>
            Already have an account? <RouterLink to="/login" class="link">Log in.</RouterLink>
        </p>
    </main>
</template>