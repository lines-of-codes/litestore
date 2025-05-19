export function login(username: string, password: string): Promise<Response> {
    return fetch(`${import.meta.env.VITE_LS_API}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({
            username,
            password,
        }),
    });
}

export function signUp(email: string, username: string, password: string) {
    return fetch(`${import.meta.env.VITE_LS_API}/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify({
            email,
            username,
            password,
        }),
    });
}

export function getToken() {
    return localStorage.getItem("ls-auth-token");
}
