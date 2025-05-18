import { loadConfig } from "./src/config";
import { prepareJwtSecret } from "./src/jwt";
import { loginRoute, signUpRoute } from "./src/routes/auth";
import {
	downloadRoute,
	uploadRoute,
	deleteRoute,
	trashRoute,
	listFilesRoute,
	moveFileRoute,
	copyFileRoute,
	createFolderRoute,
} from "./src/routes/files";
import { publicUserInfoRoute } from "./src/routes/user";
import { internalServerError, notFound, ok } from "./src/routes/responses";
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
		"/api/files/download/*": downloadRoute,
		"/api/files/delete": deleteRoute,
		"/api/files/trash": trashRoute,
		"/api/files/move": moveFileRoute,
		"/api/files/copy": copyFileRoute,
		"/api/files/list/*": listFilesRoute,
		"/api/files/link": createFileLinkRoute,
		"/api/files/link/:shareId": fileLinkInfoRoute,
		"/api/files/link/:shareId/download": downloadPublicFileRoute,
		"/api/files/create/folder": createFolderRoute,
		"/api/user/:username": publicUserInfoRoute,
	},
	fetch() {
		return notFound;
	},
	error(error) {
		console.error(error);
		return internalServerError("An unhandled and unknown error occurred.");
	},
});

console.log(`Listening on http://localhost:${server.port} ...`);
