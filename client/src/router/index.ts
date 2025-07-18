import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "home",
            component: HomeView,
        },
        {
            path: "/login",
            name: "login",
            component: () => import("@/views/LoginView.vue"),
        },
        {
            path: "/signup",
            name: "signup",
            component: () => import("@/views/SignUpView.vue"),
        },
        {
            path: "/files/:path(.*)*",
            name: "filelist",
            component: () => import("@/views/FileListView.vue"),
        },
        {
            path: "/about",
            name: "about",
            component: () => import("../views/AboutView.vue"),
        },
    ],
});

export default router;
