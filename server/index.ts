import { loadConfig } from "./src/config";
import { prepareJwtSecret } from "./src/jwt";
import { loginRoute, signUpRoute } from "./src/routes/auth";
import {
	downloadPublicFileRoute,
	downloadRoute,
	uploadRoute,
} from "./src/routes/files";
import { publicUserInfoRoute } from "./src/routes/user";

console.log("Starting the litestore server...");

await loadConfig(true);
await prepareJwtSecret();

const server = Bun.serve({
	port: 3000,
	routes: {
		"/api/status": Response.json({ status: 200 }),
		"/api/auth/signup": signUpRoute,
		"/api/auth/login": loginRoute,
		"/api/files/upload": uploadRoute,
		"/api/files/download": downloadRoute,
		"/api/files/download/:shareId": downloadPublicFileRoute,
		"/api/user/:username": publicUserInfoRoute,
	},
	fetch() {
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Listening on http://localhost:${server.port} ...`);
