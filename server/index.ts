import { loadConfig } from "./src/config";
import { prepareJwtSecret } from "./src/jwt";
import { loginRoute, signUpRoute } from "./src/routes/auth";
import {
	downloadRoute,
	uploadRoute,
	deleteRoute,
	trashRoute,
} from "./src/routes/files";
import { publicUserInfoRoute } from "./src/routes/user";
import { notFound, ok } from "./src/routes/responses";
import {
	createFileLinkRoute,
	fileLinkInfoRoute,
	downloadPublicFileRoute,
} from "./src/routes/fileLink";

console.log("Starting the litestore server...");

await loadConfig(true);
await prepareJwtSecret();

const server = Bun.serve({
	port: 3000,
	routes: {
		"/api/status": ok,
		"/api/auth/signup": signUpRoute,
		"/api/auth/login": loginRoute,
		"/api/files/upload": uploadRoute,
		"/api/files/download": downloadRoute,
		"/api/files/delete": deleteRoute,
		"/api/files/trash": trashRoute,
		"/api/files/link": createFileLinkRoute,
		"/api/files/link/:shareId": fileLinkInfoRoute,
		"/api/files/link/:shareId/download": downloadPublicFileRoute,
		"/api/user/:username": publicUserInfoRoute,
	},
	fetch() {
		return notFound;
	},
});

console.log(`Listening on http://localhost:${server.port} ...`);
